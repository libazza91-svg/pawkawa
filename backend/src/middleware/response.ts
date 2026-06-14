import { Response } from 'express';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

export function errorResponse(code: string, message: string, httpStatus: number): { body: ApiErrorResponse; status: number } {
  return {
    body: { success: false, error: { code, message } },
    status: httpStatus,
  };
}

export function sendSuccess<T>(res: Response, data: T, httpStatus = 200): void {
  res.status(httpStatus).json(successResponse(data));
}

export function sendError(res: Response, code: string, message: string, httpStatus = 400): void {
  const err = errorResponse(code, message, httpStatus);
  res.status(err.status).json(err.body);
}
