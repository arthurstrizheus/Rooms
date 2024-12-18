const ActiveDirectory = require("activedirectory2");
const ldapConfig = require("../ldapConfig");
const ad = new ActiveDirectory(ldapConfig);
const util = require("util");
const { sendGroupNotificationEmail } = require("./mailControllerjs");

const findUserAsync = util.promisify(ad.findUser.bind(ad));

const fetchGroupMembers = async (groupDN) => {
  const groupOpts = {
    baseDN: groupDN,
    filter: "(objectClass=group)",
    scope: "base",
    attributes: ["member"],
  };

  try {
    const result = await new Promise((resolve, reject) => {
      ad.find(groupOpts, (err, result) =>
        err ? reject(err) : resolve(result)
      );
    });

    if (!result || !result.groups || !result.groups.length) return [];

    let members = [];
    const group = result.groups[0];
    if (group?.member) {
      members = Array.isArray(group.member) ? group.member : [group.member];
    }

    return members
      .map((dn) => {
        const match = dn.match(/CN=((?:[^\\,]|\\,)+)/);
        return match ? match[1].replace(/\\/g, "").trim() : null;
      })
      .filter(Boolean);
  } catch (err) {
    console.error(`Error fetching members for group ${groupDN}:`, err);
    return [];
  }
};

const getAllFullOUAssociates = async (req, res) => {
  const groupOpts = {
    baseDN: "OU=Matter Manager Permission Groups,DC=sealimited,DC=local",
    filter: "(objectClass=group)",
    scope: "sub",
    attributes: ["distinguishedName", "member"],
  };

  const convertCNToUsername = (cn) => {
    const match = cn.match(/CN=([^,]+)\\,\s*(.*?)\s*-\s*(?:Full|Read)/i);
    if (!match) return null;

    if (!match) return null;

    // Extract last name and first names
    const lastName = match[1].replace(/\\/g, "").trim();
    const firstNames = match[2].trim();

    // Get the initials of all parts of the first name
    const initials = firstNames
      .split(" ")
      .map((name) => name[0].toLowerCase())
      .join("");

    return `${initials}${lastName.toLowerCase()}`.replace(
      /[*\\()\/]/g,
      (char) => {
        return `\\${char.charCodeAt(0).toString(16).padStart(2, "0")}`;
      }
    );
  };

  try {
    const result = await new Promise((resolve, reject) => {
      ad.find(groupOpts, (err, result) =>
        err ? reject(err) : resolve(result)
      );
    });

    if (!result || !result.groups || !result.groups.length) {
      return res.status(404).json({ error: "No groups found." });
    }

    const validGroups = result.groups.filter(
      (group) =>
        group.distinguishedName.includes("OU=Full") &&
        !group.distinguishedName.includes("OU=Archive")
    );

    const groupData = await Promise.all(
      validGroups.map(async (group) => {
        const ownerMatch = group.distinguishedName.match(
          /CN=(.*?)\s*-\s*(?:Full|Read)/i
        );
        const fullGroupName = group.distinguishedName.match(
          /CN=([^,]+(?:\\, [^,]+)?- (?:Full|Read))/
        );

        const ownerCN = ownerMatch ? ownerMatch[1].replace(/\\/g, "") : null;

        if (!ownerCN) return null;

        const ownerUsername = convertCNToUsername(group.distinguishedName);

        let parent = null;
        if (ownerUsername) {
          try {
            const user = await findUserAsync(ownerUsername);
            if (user) {
              parent = {
                displayName: user.displayName,
                mail: user.mail,
              };
            }
          } catch (err) {
            console.error(`Error fetching user for ${ownerUsername}:`, err);
          }
        }

        let members = [];
        if (group?.member) {
          members = Array.isArray(group.member) ? group.member : [group.member];
        }
        const groupName = fullGroupName
          ? fullGroupName[1].replace(/\\/g, "").trim()
          : null;
        // Process members and expand if they are groups
        const memberDetails = await Promise.all(
          members.map(async (dn) => {
            const match = dn.match(/CN=((?:[^\\,]|\\,)+)/);
            const memberName = match
              ? match[1].replace(/\\/g, "").trim()
              : null;

            if (!memberName) return null;

            // Check if the member is a group
            const isGroup = dn.includes("OU=Groups");
            if (isGroup) {
              const nestedMembers = await fetchGroupMembers(dn);
              return { groupName: memberName, nestedMembers };
            } else if (groupName.includes(memberName)) return null;

            return memberName;
          })
        );

        if (!groupName) {
          console.log("Group name could not be determined:", group);
        }

        return {
          parent,
          groupName,
          members: memberDetails
            .filter(Boolean)
            .filter((mem) => !fullGroupName.includes(mem)),
        };
      })
    );

    const filteredGroupData = groupData
      .filter(Boolean)
      .filter((it) => it.parent);

    if (!filteredGroupData.length) {
      return res
        .status(404)
        .json({ error: "No valid groups or members found." });
    }

    if (filteredGroupData.length > 0) {
      filteredGroupData.forEach((fd) => {
        const { parent, groupName, members } = fd;
        try {
          if (members?.length) {
            sendGroupNotificationEmail(
              parent.mail,
              parent.displayName,
              groupName,
              members
            );
          }
        } catch (err) {
          console.error(`Failed to send email to ${parent.mail}:`, err);
        }
      });
    }

    res.status(200).json({ status: "Success" }); //.json(filteredGroupData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error retrieving data", details: err });
  }
};

const getAllFullOUAssociatest = async (req, res) => {
  const groupOpts = {
    baseDN: "OU=Matter Manager Permission Groups,DC=sealimited,DC=local",
    filter: "(objectClass=group)",
    scope: "sub",
    attributes: ["distinguishedName", "member"],
  };

  // Helper function to convert a CN to a username (e.g., 'CN=Koerner\\, Tiffany' -> 'tkoerner')
  const convertCNToUsername = (cn) => {
    const match = cn.match(/CN=([^,]+\\, [^,]+)(?: - Full| - Read|)/);
    if (!match) return null;

    const cleanName = match[1].replace(/\\/g, "").trim();
    let nameParts = cleanName.split(",").map((part) => part.trim());

    if (nameParts.length === 2) {
      const [lastName, firstName] = nameParts;
      return `${firstName[0].toLowerCase()}${lastName.toLowerCase()}`;
    }
    return null;
  };

  try {
    // Fetch groups matching the filter
    const result = await new Promise((resolve, reject) => {
      ad.find(groupOpts, (err, result) =>
        err ? reject(err) : resolve(result)
      );
    });

    if (!result || !result.groups || !result.groups.length) {
      return res.status(404).json({ error: "No groups found." });
    }

    // Filter groups where the distinguishedName contains 'OU=Full' and does not contain 'OU=Archive'
    const validGroups = result.groups.filter(
      (group) =>
        group.distinguishedName.includes("OU=Full") &&
        !group.distinguishedName.includes("OU=Archive")
    );

    // Initialize an array to store the final structured data
    const groupData = await Promise.all(
      validGroups.map(async (group) => {
        const ownerMatch = group.distinguishedName.match(/CN=([^,]+)/);
        const fullGroupName = group.distinguishedName.match(
          /CN=([^,]+(?:\\, [^,]+)?- (?:Full|Read))/
        );

        const ownerCN = ownerMatch ? ownerMatch[1].replace(/\\/g, "") : null;

        if (!ownerCN) return null;

        const ownerUsername = convertCNToUsername(group.distinguishedName);

        let parent = null;
        if (ownerUsername) {
          try {
            const user = await findUserAsync(ownerUsername);
            if (user) {
              parent = {
                displayName: user.displayName,
                mail: user.mail,
              };
            }
          } catch (err) {
            console.error(`Error fetching user for ${ownerUsername}:`, err);
          }
        }

        let members = [];
        if (group?.member) {
          members = Array.isArray(group.member) ? group.member : [group.member];
        }
        let memberCNs = members
          .map((dn) => {
            // Updated regex to capture the entire CN, including escaped commas
            const match = dn.match(/CN=((?:[^\\,]|\\,)+)/);
            return match ? match[1].replace(/\\/g, "").trim() : null;
          })
          .filter(Boolean);

        const groupName = fullGroupName
          ? fullGroupName[1].replace(/\\/g, "")
          : null;
        if (!groupName) {
          console.log(group);
        }
        memberCNs = memberCNs.filter((mem) => !groupName.includes(mem));

        return {
          parent,
          groupName: groupName,
          members: memberCNs,
        };
      })
    );

    let filteredGroupData = groupData.filter(Boolean).filter((it) => it.parent);

    if (!filteredGroupData.length) {
      return res
        .status(404)
        .json({ error: "No valid groups or members found." });
    }

    // Send email to each group parent
    if (filteredGroupData.length > 0) {
      const { parent, groupName, members } = filteredGroupData[0];
      sendGroupNotificationEmail(
        parent.mail,
        parent.displayName,
        groupName,
        members
      );
    }
    // filteredGroupData.forEach((group) => {
    //   const { parent, groupName, members } = group;
    //   sendGroupNotificationEmail(
    //     parent.mail,
    //     parent.displayName,
    //     groupName,
    //     members
    //   );
    // });

    res.status(200).json(filteredGroupData);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error retrieving data", details: err });
  }
};

module.exports = {
  getAllFullOUAssociates,
};
