import SMB2 from "@marsaud/smb2";

export const smb2Client = new SMB2({
  share: `\\\\${process.env.SMB_SERVER}\\${process.env.SMB_SHARE}`,
  domain: process.env.SMB_DOMAIN || "",
  username: process.env.SMB_USER || "",
  password: process.env.SMB_PASSWORD || "",
  autoCloseTimeout: 0,
});