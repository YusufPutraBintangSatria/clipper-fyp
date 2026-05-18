import { createSwaggerSpec } from 'next-swagger-doc';
import { NextResponse } from 'next/server';

export async function GET() {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api', // define api folder under app directory
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Auto Clipper REST API',
        version: '1.0.0',
        description: 'Dokumentasi otomatis REST API Auto Clipper untuk manajemen video dan unggahan.',
      },
      servers: [
        {
          url: 'http://localhost:3000',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [],
    },
  });

  return NextResponse.json(spec);
}
