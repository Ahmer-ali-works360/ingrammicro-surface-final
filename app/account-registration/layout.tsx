// src/app/account-registration/layout.tsx


export default function RegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
  

      <main className="flex-1 flex min-h-0 w-full">
        {children}
      </main>

 
    </div>
  );
}