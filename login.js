import {
  createAdminToken,
  handleError,
  requestBody,
  requireMethod,
  sendJson,
  verifyAdminPassword
} from "../_lib.js";

export default function handler(req, res) {
  try {
    requireMethod(req, ["POST"]);
    const { password } = requestBody(req);
    if (!verifyAdminPassword(password)) {
      return sendJson(res, 401, { error: "That password doesn't match. Please try again." });
    }
    return sendJson(res, 200, { token: createAdminToken() });
  } catch (error) {
    return handleError(res, error);
  }
}
