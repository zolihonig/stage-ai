import Navbar from "@/components/Navbar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-ivory-light">{children}</main>
    </>
  );
}
