const nodemailer = require("nodemailer");

// SMTP server configuration
const SMTP_Server = {
  host: process.env.SMTP_SERVER, // Replace with your SMTP server
  port: 25, // Typically 587 for TLS, 465 for SSL
  secure: false, // Set to true if using SSL
};

/**
 * Sends an email to the parent notifying them of their group ownership and members with full access.
 * @param {string} parentEmail - The email of the group parent.
 * @param {string} parentName - The display name of the group parent.
 * @param {string} groupName - The name of the group.
 * @param {string[]} members - An array of member CNs.
 */
const sendGroupNotificationEmail = async (
  parentEmail,
  parentName,
  groupName,
  members
) => {
  if (!parentEmail) {
    console.error("Parent email is required.");
    return;
  }

  // Create the email transporter
  const transporter = nodemailer.createTransport(SMTP_Server);

  const generateMemberList = (members) => {
    return members
      .map((member) => {
        if (typeof member === "string") {
          // Regular member
          return `<li>${member}</li>`;
        } else if (
          typeof member === "object" &&
          member.groupName &&
          member.nestedMembers
        ) {
          // Group with nested members
          const nestedList = member.nestedMembers
            .map(
              (nestedMember) =>
                `<li style="margin-left: 20px;">${nestedMember}</li>`
            )
            .join("");
          return `<li>${member.groupName}<ul>${nestedList}</ul></li>`;
        }
        return null;
      })
      .filter(Boolean)
      .join("");
  };

  // Create the email content
  const memberList = members.map((member) => `<li>${member}</li>`).join("");
  const emailSubject = `Group Ownership Notification: ${groupName}`;
  const emailBody = `
  <p>Dear ${parentName},</p>
  <p>You are listed as the parent (owner) for the group <strong>${groupName}</strong>.</p>
  <p>The following associates have full access to your matters:</p>
  <ul>${generateMemberList(members)}</ul>
  <p>Please ensure that this access is appropriate and up-to-date.</p>
  <p>If there is an issue with access, please reply to this email with any concerns.</p>
  <p></p>
  <p>Thank you.</p>
`;

  try {
    // Send the email
    const info = await transporter.sendMail({
      from: "ithelp@sealimited.com", // From address using COLWEB
      to: parentEmail,
      subject: emailSubject,
      html: emailBody,
    });

    console.log(`Email sent to ${parentEmail}: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending email to ${parentEmail}:`, error);
  }
};

module.exports = { sendGroupNotificationEmail };
