import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyNewUserRequest {
  userEmail: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, appUrl }: NotifyNewUserRequest = await req.json();

    console.log('Sending notification email for new user:', userEmail);

    const emailResponse = await resend.emails.send({
      from: "KC Tienda <onboarding@resend.dev>",
      to: ["info@kccomputacion.com"],
      subject: "Nuevo usuario registrado - Requiere aprobación",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #003942 0%, #002F36 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .user-info {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #0A8754;
              }
              .button {
                display: inline-block;
                background: #0A8754;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin-top: 20px;
              }
              .button:hover {
                background: #096d43;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔔 Nuevo Usuario Registrado</h1>
            </div>
            <div class="content">
              <p><strong>¡Hola Administrador!</strong></p>
              
              <p>Un nuevo usuario se ha registrado en la aplicación y está esperando tu aprobación para poder acceder.</p>
              
              <div class="user-info">
                <p><strong>📧 Email del usuario:</strong></p>
                <p style="font-size: 18px; color: #0A8754; margin: 10px 0;">${userEmail}</p>
              </div>
              
              <p>El usuario no podrá usar la aplicación hasta que apruebes su cuenta desde el panel de administración.</p>
              
              <p style="text-align: center;">
                <a href="${appUrl}/admin/users" class="button">
                  Ver Panel de Gestión de Usuarios
                </a>
              </p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                <strong>Acciones disponibles:</strong><br>
                • Aprobar el usuario para darle acceso inmediato<br>
                • Mantenerlo pendiente si necesitas verificar información adicional<br>
                • Desaprobar si el registro no es legítimo
              </p>
              
              <div class="footer">
                <p>Este es un mensaje automático del sistema de gestión de usuarios.</p>
                <p>© ${new Date().getFullYear()} KC Informatika - Todos los derechos reservados</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-new-user function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Error al enviar notificación por email"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
