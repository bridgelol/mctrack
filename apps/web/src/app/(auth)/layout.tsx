export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">MCTrack</h1>
          <p className="text-base-content/60 mt-2">Minecraft Server Analytics</p>
        </div>
        {children}
      </div>
    </div>
  );
}
