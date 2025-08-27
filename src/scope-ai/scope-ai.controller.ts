import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ScopeAIService, ScopeAnalysisRequest, ScopeAnalysisResponse } from './scope-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as fs from 'fs/promises';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

@Controller('scope-ai')
@UseGuards(JwtAuthGuard)
export class ScopeAIController {
  constructor(private readonly scopeAIService: ScopeAIService) {}

  @Post('analyze')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, callback) => {
      // Aceitar imagens, PDFs, documentos de texto
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain', 'text/markdown',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new Error('Tipo de arquivo não suportado'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async analyzeRequirements(
    @Body() body: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<ScopeAnalysisResponse> {
    
    // Tratar tanto FormData quanto JSON
    let request: ScopeAnalysisRequest;
    if (files && files.length > 0) {
      // Dados vem do FormData
      request = {
        projectDescription: body.projectDescription,
        additionalInfo: body.additionalInfo,
        attachedDocuments: body.attachedDocuments ? JSON.parse(body.attachedDocuments) : undefined
      };
    } else {
      // Dados vem como JSON normal
      request = body as ScopeAnalysisRequest;
    }
    
    // Processar arquivos enviados
    if (files && files.length > 0) {
      const processedFiles = await Promise.all(files.map(async (file) => {
        let content = '';
        
        try {
          if (file.mimetype.startsWith('text/') || file.mimetype === 'text/plain') {
            // Ler arquivos de texto
            content = await fs.readFile(file.path, 'utf-8');
          } else if (file.mimetype.startsWith('image/')) {
            // Para imagens, usar base64 (OpenAI Vision API)
            const buffer = await fs.readFile(file.path);
            content = buffer.toString('base64');
          } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/msword') {
            // Ler arquivos DOCX/DOC usando mammoth
            const buffer = await fs.readFile(file.path);
            const result = await mammoth.extractRawText({ buffer });
            content = result.value;
          } else if (file.mimetype === 'application/pdf') {
            // Ler arquivos PDF usando pdf-parse
            const buffer = await fs.readFile(file.path);
            const pdfData = await pdfParse(buffer);
            content = pdfData.text;
          }
          
          // Log do conteúdo extraído para debug
          console.log(`Arquivo processado: ${file.originalname}`);
          console.log(`Tipo: ${file.mimetype}`);
          console.log(`Tamanho do conteúdo extraído: ${content.length} caracteres`);
          console.log(`Prévia do conteúdo: ${content.substring(0, 200)}...`);
          
          return {
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            content: content,
            path: file.path
          };
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          return {
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            path: file.path
          };
        }
      }));
      
      request.attachedFiles = processedFiles;
    }
    
    return this.scopeAIService.analyzeRequirements(request);
  }

  @Post('approve')
  async approveAnalysis(@Body() body: { analysisId: string }) {
    return this.scopeAIService.approveAnalysis(body.analysisId);
  }
}