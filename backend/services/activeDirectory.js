const util = require("util");

/**
 * The one place Active Directory is talked to for group work.
 *
 * `userController.js` still builds its own client for the login path
 * (findUser/authenticate); this module exists so that group lookups — which
 * every approval check depends on — have a home that degrades quietly instead
 * of taking the process down.
 *
 * Nothing here throws. An LDAP outage must show up as "no groups found" or
 * "not a member", never as a 500 on an unrelated request.
 */

// Built lazily and cached. `../ldapConfig` READS THE CA FILE AT REQUIRE TIME
// AND THROWS when it is missing, so requiring it at module scope would take the
// whole API down on any box without a CA — including dev machines that never
// talk to LDAP at all.
let client = null;
let clientResolved = false;

function getClient() {
    if (clientResolved) {
        return client;
    }
    clientResolved = true;

    try {
        const ActiveDirectory = require("activedirectory2");
        const ldapConfig = require("../ldapConfig");

        // No URL or no search base means LDAP simply isn't set up here.
        if (!ldapConfig.url || !ldapConfig.baseDN) {
            return null;
        }

        const ad = new ActiveDirectory(ldapConfig);

        // Every activedirectory2 method is callback-style.
        client = {
            findGroups: util.promisify(ad.findGroups.bind(ad)),
            getUsersForGroup: util.promisify(ad.getUsersForGroup.bind(ad)),
            isUserMemberOf: util.promisify(ad.isUserMemberOf.bind(ad)),
        };
    } catch (err) {
        // Only the message — the config object carries the bind password.
        console.error(
            "Active Directory is unavailable; group lookups will return empty:",
            err.message,
        );
        client = null;
    }

    return client;
}

/**
 * Whether AD can be reached at all. Callers use this to render "LDAP is not
 * configured" rather than an empty list that looks like a failed search.
 */
function isConfigured() {
    return getClient() !== null;
}

// Characters that change the meaning of an LDAP filter. An unescaped "(" makes
// the filter unparseable and an unescaped "*" turns a literal search into a
// wildcard the caller never asked for. Done in a single pass so the backslash
// replacement can't go on to escape its own output.
const LDAP_FILTER_ESCAPES = {
    "\\": "\\5c",
    "*": "\\2a",
    "(": "\\28",
    ")": "\\29",
    "\0": "\\00",
};

function escapeFilterValue(value) {
    return String(value).replace(
        /[\\*()\0]/g,
        (char) => LDAP_FILTER_ESCAPES[char],
    );
}

// A directory query is far too slow to sit in the path of every approval
// check, so results are held briefly in process.
//
// The trade-off is deliberate and it cuts one way: for up to TTL_MS after a
// change in AD, someone removed from an approver group keeps their approval
// rights, and someone just added doesn't have them yet. Five minutes is short
// enough that nobody notices the lag and long enough that a queue of pending
// approvals doesn't hammer the directory. Lengthen it only if you are happy
// with a longer window of stale authority.
const CACHE_TTL_MS = 5 * 60 * 1000;

// Hard ceiling so a long-lived process can't accumulate an entry per
// user/group pair forever. Insertion-ordered, so the oldest goes first.
const CACHE_MAX_ENTRIES = 2000;

const membershipCache = new Map(); // "username|groupDn" -> { value, expiresAt }
const groupMemberCache = new Map(); // groupDn -> { value, expiresAt }

function cacheGet(cache, key) {
    const hit = cache.get(key);
    if (!hit) {
        return undefined;
    }
    if (hit.expiresAt <= Date.now()) {
        cache.delete(key);
        return undefined;
    }
    return hit.value;
}

function cacheSet(cache, key, value) {
    if (cache.size >= CACHE_MAX_ENTRIES && !cache.has(key)) {
        cache.delete(cache.keys().next().value);
    }
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Search AD groups by name.
 *
 * @param {string} search Substring to match against the group's cn.
 * @returns {Promise<Array<{name: string, dn: string, description: string}>>}
 *          Empty when LDAP is absent, the term is blank, or the search fails.
 */
async function findGroups(search) {
    const ad = getClient();
    if (!ad) {
        return [];
    }

    const term = String(search || "").trim();
    if (!term) {
        return [];
    }

    try {
        // activedirectory2 ANDs this with its own "is really a group" filter.
        // Only the attributes below are requested — a group object carries the
        // whole member list otherwise, which for a large group is enormous.
        const groups = await ad.findGroups({
            filter: `(cn=*${escapeFilterValue(term)}*)`,
            attributes: ["cn", "dn", "distinguishedName", "description"],
        });

        const byDn = new Map();
        for (const group of groups || []) {
            const dn = group.dn || group.distinguishedName;
            if (!dn || !group.cn) {
                continue;
            }
            if (!byDn.has(dn)) {
                byDn.set(dn, {
                    name: group.cn,
                    dn,
                    description: group.description || "",
                });
            }
        }

        return Array.from(byDn.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 50); // A picker; nobody scrolls past this many.
    } catch (err) {
        console.error(`AD group search for "${term}" failed:`, err.message);
        return [];
    }
}

/**
 * The people in a group, used to fan notifications out to an approver group.
 *
 * Nested groups are resolved by activedirectory2, as is AD's ranged
 * `member;range=0-1499` attribute, which otherwise silently truncates any
 * group larger than 1500 members.
 *
 * @param {string} groupDn Distinguished name of the group.
 * @returns {Promise<Array<{username: string, email: string, displayName: string}>>}
 */
async function getGroupMembers(groupDn) {
    if (!groupDn) {
        return [];
    }

    const cacheKey = String(groupDn).toLowerCase();
    const cached = cacheGet(groupMemberCache, cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const ad = getClient();
    if (!ad) {
        return [];
    }

    try {
        const users = await ad.getUsersForGroup(
            { attributes: ["sAMAccountName", "mail", "displayName"] },
            groupDn,
        );

        const members = (users || [])
            // No mail means there is nothing to notify — service accounts and
            // the like. Dropped rather than carried around as a null address.
            .filter((user) => user && user.mail)
            .map((user) => ({
                username: user.sAMAccountName || "",
                email: user.mail,
                displayName: user.displayName || user.cn || user.mail,
            }));

        cacheSet(groupMemberCache, cacheKey, members);
        return members;
    } catch (err) {
        // Deliberately NOT cached. A transient outage would otherwise blank out
        // an approver group's notifications for the whole TTL.
        console.error(`AD member lookup for "${groupDn}" failed:`, err.message);
        return [];
    }
}

/**
 * Whether a user is in a group, directly or through a nested group.
 *
 * Fails CLOSED: an LDAP outage returns false, so a directory problem can never
 * hand approval rights to someone who doesn't have them.
 *
 * @param {string} username sAMAccountName.
 * @param {string} groupDn Distinguished name of the group.
 * @returns {Promise<boolean>}
 */
async function isUserMemberOf(username, groupDn) {
    if (!username || !groupDn) {
        return false;
    }

    const cacheKey = `${String(username).toLowerCase()}|${String(groupDn).toLowerCase()}`;
    const cached = cacheGet(membershipCache, cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const ad = getClient();
    if (!ad) {
        return false;
    }

    try {
        const isMember = await ad.isUserMemberOf({}, username, groupDn);
        cacheSet(membershipCache, cacheKey, !!isMember);
        return !!isMember;
    } catch (err) {
        // Not cached: a five-minute outage must not lock a legitimate approver
        // out for five minutes after the directory comes back.
        console.error(
            `AD membership check for "${username}" failed:`,
            err.message,
        );
        return false;
    }
}

module.exports = {
    isConfigured,
    findGroups,
    getGroupMembers,
    isUserMemberOf,
};
