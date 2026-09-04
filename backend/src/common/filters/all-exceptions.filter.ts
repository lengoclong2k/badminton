import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Ánh xạ lỗi Postgres (kể cả RAISE tiếng Việt trong function) sang HTTP hợp lý. */
const PG_ERROR_TO_HTTP: Record<string, HttpStatus> = {
  '23505': HttpStatus.CONFLICT, // unique_violation
  '23503': HttpStatus.BAD_REQUEST, // foreign_key_violation
  '23514': HttpStatus.BAD_REQUEST, // check_violation
  '42501': HttpStatus.FORBIDDEN, // insufficient_privilege — require_admin()
  P0002: HttpStatus.NOT_FOUND, // no_data_found
  '55000': HttpStatus.CONFLICT, // object_not_in_prerequisite_state
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Đã có lỗi xảy ra';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as { message?: string }).message ?? res;
    } else if (exception instanceof QueryFailedError) {
      const code = (exception as QueryFailedError & { code?: string }).code;
      status = (code ? PG_ERROR_TO_HTTP[code] : undefined) ?? HttpStatus.BAD_REQUEST;
      message = exception.message.replace(/^error:\s*/i, '');
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, (exception as Error)?.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
