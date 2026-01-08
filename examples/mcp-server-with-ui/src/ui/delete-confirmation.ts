import { z } from "zod";

const DeleteConfirmationSchema = z.object({
  deleted: z.boolean(),
  locationId: z.string(),
  message: z.string(),
});

function renderDeleteConfirmation(
  props: z.infer<typeof DeleteConfirmationSchema>,
): string {
  return `
    <div style="
      padding: 20px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border-radius: 12px;
      text-align: center;
      max-width: 400px;
      margin: 0 auto;
    ">
      <div style="font-size: 32px; margin-bottom: 12px;">🗑️</div>
      <div style="font-weight: 600; margin-bottom: 8px; font-size: 18px;">${props.message}</div>
      <div style="font-size: 12px; opacity: 0.8; font-family: monospace; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; display: inline-block;">
        ID: ${props.locationId}
      </div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3);">
        <div style="font-size: 14px; opacity: 0.9;">
          ${props.deleted ? "✅ Deleting completed successfully" : "⚠️ Deletion status unknown"}
        </div>
      </div>
    </div>
  `;
}

export const DeleteConfirmationComponent = {
  name: "DeleteConfirmation",
  schema: DeleteConfirmationSchema,
  render: renderDeleteConfirmation,
};
