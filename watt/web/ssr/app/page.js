import Image from "next/image";

export const revalidate = 0; // Disable ISR for this page

export default async function Home() {
  'use server'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    Current time: {new Date().toLocaleTimeString()}
    <br />
    process pid: {process.pid}
    </div>
  );
}
