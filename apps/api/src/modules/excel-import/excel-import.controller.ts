import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../../common/current-user";
import type { SessionClaims } from "../auth/token";
import { ExcelImportService } from "./excel-import.service";

@Controller("import")
export class ExcelImportController {
  constructor(@Inject(ExcelImportService) private readonly excel: ExcelImportService) {}

  @Post("excel")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  upload(
    @UploadedFile() file: { buffer?: Buffer; originalname?: string } | undefined,
    @CurrentUser() user: SessionClaims,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Upload an .xlsx file as field `file`");
    }
    if (file.originalname && !file.originalname.toLowerCase().endsWith(".xlsx")) {
      throw new BadRequestException("Only .xlsx workbooks are accepted");
    }
    return this.excel.importWorkbook(file.buffer, user);
  }
}
