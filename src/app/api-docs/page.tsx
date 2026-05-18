"use client";

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// SwaggerUI requires the window object, so we must load it dynamically with ssr disabled
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  return (
    <div className="container mx-auto p-4 bg-white min-h-screen">
      <SwaggerUI url="/api/swagger" />
    </div>
  );
}
