"use client";
import Header from "@/components/header";
import Card from "@/components/card";
import { GlobalStateProvider } from "@/context/GlobalStateContext";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import React from 'react';


export default function Home() {
  return (
    <GlobalStateProvider>
      <main className=" min-h-screen">
        <Header />
        <Card />
      </main>
      <ToastContainer />
    </GlobalStateProvider>
  );
}
