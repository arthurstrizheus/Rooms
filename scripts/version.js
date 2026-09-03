#!/usr/bin/env node
/**
 * Stamp a build number. Runs automatically from `prebuild`, so
 * `npm run build` always ships a version that is different from the last one.
 *
 *   YY.MM.DD.BUILD      e.g. 26.09.03.2
 *
 * The build counter restarts at 0 each day, so the number answers the only two
 * questions anyone asks of it: which day is this from, and is it newer than the
 * one I have.
 *
 * Two files are written because two things read the version and they cannot
 * read each other: `.env` supplies REACT_APP_VERSION, which is the only way a
 * value reaches the bundle under Create React App, and `package.json` is where
 * anyone looks for it. They had already drifted -- package.json said 26.01.30.0
 * while the running app showed 26.02.05.0 -- which is what having two hand-
 * maintained sources of truth gets you.
 *
 * `.env` is tracked in this repo, so a build leaves the bumped version in the
 * working tree to be committed. That is deliberate: the number is part of the
 * release, not a local artefact.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const ENV_KEY = "REACT_APP_VERSION";

const pad = (n) => String(n).padStart(2, "0");

/** Local date, not UTC — the build number should match the builder's calendar. */
function todayPrefix(now = new Date()) {
    return [
        pad(now.getFullYear() % 100),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
    ].join(".");
}

/**
 * The `REACT_APP_VERSION` value in .env, or null. Quotes and spacing vary.
 *
 * `[ \t]*`, never `\s*`. This file has CRLF endings, and in multiline mode a
 * JS `^` also matches between the \r and the \n — so a leading `\s*` swallows
 * the newline and the replacement below welds this line onto the previous one.
 */
function readEnvVersion(contents) {
    const match = contents.match(
        new RegExp(
            `^[ \\t]*${ENV_KEY}[ \\t]*=[ \\t]*["']?([^"'\\r\\n]*)["']?`,
            "m",
        ),
    );
    return match ? match[1].trim() : null;
}

/**
 * Next version for today.
 *
 * A version from an earlier day (or a missing/unparseable one) starts the day
 * at 0 rather than continuing someone else's count.
 */
function nextVersion(current, prefix) {
    const parts = String(current || "").split(".");
    const sameDay =
        parts.length === 4 && parts.slice(0, 3).join(".") === prefix;
    const previous = sameDay ? Number.parseInt(parts[3], 10) : NaN;
    const build = Number.isFinite(previous) ? previous + 1 : 0;
    return `${prefix}.${build}`;
}

function writeEnv(contents, version) {
    const line = `${ENV_KEY} = "${version}"`;
    // See readEnvVersion: `[ \t]*` rather than `\s*`, and `[^\r\n]*` rather
    // than `.*$`, so neither end of the match can reach into a neighbouring
    // line's terminator.
    const pattern = new RegExp(
        `^[ \\t]*${ENV_KEY}[ \\t]*=[^\\r\\n]*`,
        "m",
    );

    if (pattern.test(contents)) {
        return contents.replace(pattern, line);
    }
    // Missing key: append rather than fail, so a fresh checkout self-heals.
    const separator = contents.endsWith("\n") || contents === "" ? "" : "\n";
    return `${contents}${separator}${line}\n`;
}

function main() {
    const prefix = todayPrefix();

    let envContents = "";
    try {
        envContents = fs.readFileSync(ENV_FILE, "utf8");
    } catch {
        console.warn(`version: no ${path.basename(ENV_FILE)}, creating one`);
    }

    const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));

    // .env wins as the source of truth: it is what the running app displays,
    // so it is what "the last build" actually was.
    const current = readEnvVersion(envContents) || pkg.version;
    const version = nextVersion(current, prefix);

    fs.writeFileSync(ENV_FILE, writeEnv(envContents, version));

    pkg.version = version;
    // Two spaces and a trailing newline, matching how npm itself writes it, so
    // bumping the version never shows up as a whole-file reformat.
    fs.writeFileSync(PACKAGE_FILE, `${JSON.stringify(pkg, null, 2)}\n`);

    console.log(`version: ${current || "(none)"} -> ${version}`);
}

main();
