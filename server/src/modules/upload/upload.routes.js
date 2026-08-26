import { saveUploadedFileBuffer } from '../../shared/utils/fileStorage.js';

export default async function uploadRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard];

  // POST /api/upload — Single file multipart upload directly to disk
  fastify.post('/upload', { onRequest }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ success: false, message: 'No file was uploaded.' });
      }

      const companyCode = request.companyCode || request.tenantCode || request.tenant?.code || request.user?.companyCode || request.user?.company_code || 'default';
      const subfolder = (data.fields?.subfolder?.value || request.query?.subfolder || 'cust-proofs').trim();
      const category = (data.fields?.category?.value || request.query?.category || 'proof').trim();
      const prefix = (data.fields?.prefix?.value || request.query?.prefix || category || 'file').trim();

      const buffer = await data.toBuffer();
      const fileUrl = await saveUploadedFileBuffer(
        buffer,
        data.filename,
        data.mimetype,
        companyCode,
        subfolder,
        prefix
      );

      return reply.code(201).send({
        success: true,
        message: 'File uploaded successfully to disk',
        data: {
          name: data.filename,
          url: fileUrl,
          type: data.mimetype,
          size: buffer.length,
          subfolder,
          category
        }
      });
    } catch (err) {
      fastify.log.error(err, 'Failed to process file upload');
      return reply.code(err.statusCode || 500).send({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
  });

  // POST /api/upload/multiple — Multiple files multipart upload directly to disk
  fastify.post('/upload/multiple', { onRequest }, async (request, reply) => {
    try {
      const parts = request.files();
      const uploadedFiles = [];
      const companyCode = request.companyCode || request.tenantCode || request.tenant?.code || request.user?.companyCode || request.user?.company_code || 'default';

      for await (const part of parts) {
        if (part.file) {
          const subfolder = (part.fields?.subfolder?.value || request.query?.subfolder || 'cust-proofs').trim();
          const category = (part.fields?.category?.value || request.query?.category || 'proof').trim();
          const prefix = (part.fields?.prefix?.value || request.query?.prefix || category || 'doc').trim();

          const buffer = await part.toBuffer();
          const fileUrl = await saveUploadedFileBuffer(
            buffer,
            part.filename,
            part.mimetype,
            companyCode,
            subfolder,
            prefix
          );

          uploadedFiles.push({
            name: part.filename,
            url: fileUrl,
            type: part.mimetype,
            size: buffer.length,
            subfolder,
            category
          });
        }
      }

      if (!uploadedFiles.length) {
        return reply.code(400).send({ success: false, message: 'No valid files received for upload.' });
      }

      return reply.code(201).send({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully to disk`,
        data: uploadedFiles
      });
    } catch (err) {
      fastify.log.error(err, 'Failed to process multiple file uploads');
      return reply.code(err.statusCode || 500).send({
        success: false,
        message: err.message || 'Multiple file upload failed'
      });
    }
  });
}
