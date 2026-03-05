import NavBar from "./components/landing/NavBar";
import HeroSection from "./components/landing/HeroSection";
import SocialProof from "./components/landing/SocialProof";
import UseCasesShowcase from "./components/landing/UseCasesShowcase";
import HowItWorks from "./components/landing/HowItWorks";
import ResultsShowcase from "./components/landing/ResultsShowcase";
import AgentTeamPreview from "./components/landing/AgentTeamPreview";
import WhyChooseUs from "./components/landing/WhyChooseUs";
import PricingSection from "./components/landing/PricingSection";
import FAQSection from "./components/landing/FAQSection";
import FinalCTA from "./components/landing/FinalCTA";
import Footer from "./components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <HeroSection />
      <SocialProof />
      <UseCasesShowcase />
      <HowItWorks />
      <ResultsShowcase />
      <AgentTeamPreview />
      <WhyChooseUs />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
