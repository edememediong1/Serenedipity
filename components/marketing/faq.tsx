import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlassCard } from "@/components/ui/glass-card";
import { APP_NAME } from "@/lib/config";
import { Section } from "./section";

const FAQS = [
  {
    q: "Is this a mental health service?",
    a: `No. ${APP_NAME}'s focus guide is an AI that helps you plan your work and stay on track. It isn't a medical or mental health service, and it doesn't replace one. If you need more support, it points you to real people and resources who can help.`,
  },
  {
    q: "What happens in a check-in?",
    a: "You say or type how you're feeling and what's due. The focus guide reflects it back briefly, asks a few short questions, then turns it into small tasks that fit before your deadline. You can edit the plan before you start.",
  },
  {
    q: "Do I need headphones?",
    a: "Not for the music. The binaural focus layer works best with headphones, because it plays a slightly different tone in each ear.",
  },
  {
    q: "Do I have to turn on my camera in focus rooms?",
    a: "No. Mic and camera are off by default and stay that way unless you turn them on. Rooms are for adults (18+), and you can report or block anyone at any time.",
  },
  {
    q: "What's included for free?",
    a: "A rotating selection of music, the Pomodoro timer, one check-in a day and one trial focus room. Premium unlocks the full library, the binaural layer, unlimited check-ins and all rooms.",
  },
  {
    q: "Can I cancel Premium?",
    a: "Yes, anytime. If you cancel, Premium stays on until the end of the period you've already paid for.",
  },
  {
    q: "What happens to what I say in a check-in?",
    a: "Voice notes are turned into text and the audio is deleted. You can delete your check-in history whenever you like, and it's never used for advertising or sold.",
  },
];

export function Faq() {
  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      align="center"
      title={
        <>
          Good <em>questions</em>
        </>
      }
    >
      <GlassCard className="mx-auto max-w-3xl px-5 py-2 md:px-8 md:py-4">
        <Accordion type="single" collapsible>
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </GlassCard>
    </Section>
  );
}
