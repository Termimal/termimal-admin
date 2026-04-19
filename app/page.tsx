export const runtime = "edge";

export default function ContentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Content / CMS</h2>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          Manage your site content here.
        </p>
      </div>
      <div
        className="rounded-lg border p-8 text-center"
        style={{ borderColor: 'var(--border)', color: 'var(--t4)' }}
      >
        <p className="text-sm">No content entries yet.</p>
      </div>
    </div>
  );
}