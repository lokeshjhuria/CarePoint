import { handleError, requireMethod, sendJson } from "./_lib.js";
import { doctors } from "./_doctors.js";

export default function handler(req, res) {
  try {
    requireMethod(req, ["GET"]);
    return sendJson(res, 200, {
      doctors,
      departments: [...new Set(doctors.map(doctor => doctor.department))]
    });
  } catch (error) {
    return handleError(res, error);
  }
}
