export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new ApiError(400, 'VALIDATION_ERROR', message, details);
export const unauthorized = (message = 'กรุณาเข้าสู่ระบบ') => new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้') => new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'ไม่พบข้อมูล') => new ApiError(404, 'NOT_FOUND', message);
export const conflict = (message = 'ข้อมูลถูกแก้ไขโดยผู้อื่น กรุณาโหลดใหม่', details) =>
  new ApiError(409, 'CONFLICT', message, details);
export const invalidState = (message) => new ApiError(422, 'INVALID_STATE', message);
