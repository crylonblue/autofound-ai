import NavBar from "./components/landing/NavBar";
import HeroSection from "./components/landing/HeroSection";
import TechBar from "./components/landing/TechBar";
import TerminalDemo from "./components/TerminalDemo";
import HowItWorks from "./components/landing/HowItWorks";
import SkillsShowcase from "./components/landing/SkillsShowcase";
import AgentBuilderPreview from "./components/landing/AgentBuilderPreview";
import Differentiators from "./components/landing/Differentiators";
import PricingSection from "./components/landing/PricingSection";
import FAQSection from "./components/landing/FAQSection";
import FinalCTA from "./components/landing/FinalCTA";
import Footer from "./components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <HeroSection />
      <TechBar />
      <TerminalDemo />
      <HowItWorks />
      <SkillsShowcase />
      <AgentBuilderPreview />
      <Differentiators />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
