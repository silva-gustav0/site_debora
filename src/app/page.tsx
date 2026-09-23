import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Team from "@/components/Team";
import Schedule from "@/components/Schedule";
import BlogSection from "@/components/BlogSection";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getPublicConfig } from "@/app/actions/public";

// Serviços e horários vêm do banco; o painel revalida ao salvar, e isto é a rede de segurança.
export const revalidate = 300;

export default async function Home() {
  const config = await getPublicConfig();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <Team />
        <Schedule config={config} />
        <BlogSection />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
