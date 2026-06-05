import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { AboutSection } from '@/components/sections/about-section'
import { ServicesSection } from '@/components/sections/services-section'
import { BrandsSection } from '@/components/sections/brands-section'
import { ProjectsSection } from '@/components/sections/projects-section'
import { ShowroomSection } from '@/components/sections/showroom-section'
import { DataSection } from '@/components/sections/data-section'
import { CooperationSection } from '@/components/sections/cooperation-section'

export default function Home() {
  return (
    <main>
      <Nav />
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <BrandsSection />
      <ProjectsSection />
      <ShowroomSection />
      <DataSection />
      <CooperationSection />
      <Footer />
    </main>
  )
}
