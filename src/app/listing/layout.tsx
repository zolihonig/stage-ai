import Navbar from "@/components/Navbar";

export default function ListingLayout({
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
