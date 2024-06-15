"use client";
import Header from "@/components/header";
import Card from "@/components/card";
import { GlobalStateProvider } from "@/context/GlobalStateContext";

export default function Home() {
  return (
    <GlobalStateProvider>
      <main className=" min-h-screen">
        <Header />
        <Card />
      </main>
    </GlobalStateProvider>
  );
}
