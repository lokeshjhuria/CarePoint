import {
  ApiError,
  handleError,
  requestBody,
  requireAdmin,
  requireMethod,
  sendJson,
  supabaseRequest
} from "../_lib.js";

export default async function handler(req, res) {
  try {
    requireMethod(req, ["PATCH", "DELETE"]);
    requireAdmin(req);
    const id = req.query.id;
    if (!id || !/^\d+$/.test(id)) {
      throw new ApiError(400, "A valid appointment id is required.");
    }
    const filter = `appointments?id=eq.${encodeURIComponent(id)}`;
    if (req.method === "DELETE") {
      const [appointment] = await supabaseRequest(filter, {
        method: "DELETE",
        prefer: "return=representation"
      });
      if (!appointment) throw new ApiError(404, "Appointment not found.");
      return sendJson(res, 200, { message: "Appointment deleted." });
    }
    const { status } = requestBody(req);
    if (!["Scheduled", "Completed", "Cancelled"].includes(status)) {
      throw new ApiError(400, "Status must be Scheduled, Completed, or Cancelled.");
    }
    const [appointment] = await supabaseRequest(filter, {
      method: "PATCH",
      prefer: "return=representation",
      body: { status }
    });
    if (!appointment) throw new ApiError(404, "Appointment not found.");
    return sendJson(res, 200, { id: appointment.id, status: appointment.status });
  } catch (error) {
    return handleError(res, error);
  }
}
