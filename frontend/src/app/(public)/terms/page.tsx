import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | Ad Agent AI",
  description: "Terms of Service for Ad Agent AI platform",
}

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold mb-8">Terms of Service</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground">
          Last updated: January 2025
        </p>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing and using Ad Agent AI (&quot;Service&quot;), operated by KV Labs (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not access or use the Service. These Terms constitute a legally binding agreement between you and the Company.
          </p>
          <p className="text-muted-foreground">
            We reserve the right to modify these Terms at any time. Material changes will be communicated via email or through the Service. Your continued use of the Service after any modifications constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">2. Description of Service</h2>
          <p className="text-muted-foreground">
            Ad Agent AI provides AI-powered tools to help manage and analyze your advertising accounts across platforms like Google AdMob and Google Ad Manager. The Service acts as an interface between you and your advertising data, utilizing artificial intelligence to provide insights, answer questions, and assist with account management tasks.
          </p>
          <p className="text-muted-foreground">
            The Service is provided for informational and productivity purposes only. We do not guarantee any specific business outcomes, revenue increases, or advertising performance improvements.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">3. Eligibility</h2>
          <p className="text-muted-foreground">
            You must be at least 18 years old (or the age of majority in your jurisdiction) to use this Service. By using the Service, you represent and warrant that you have the legal capacity to enter into these Terms and that you are not prohibited from using the Service under applicable law.
          </p>
          <p className="text-muted-foreground">
            If you are using the Service on behalf of a company, organization, or other entity, you represent and warrant that you have the authority to bind that entity to these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">4. User Accounts</h2>
          <p className="text-muted-foreground">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other security breach. We are not liable for any loss or damage arising from your failure to protect your account credentials.
          </p>
          <p className="text-muted-foreground">
            You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">5. API Access and Third-Party Platforms</h2>
          <p className="text-muted-foreground">
            When you connect your advertising accounts, you authorize us to access your account data via official APIs provided by third-party platforms (such as Google AdMob and Google Ad Manager). We only access data necessary to provide the Service and do not store your primary credentials—only secure OAuth refresh tokens.
          </p>
          <p className="text-muted-foreground">
            <strong>Important:</strong> We are not affiliated with, endorsed by, or officially connected with Google LLC, Google AdMob, Google Ad Manager, or any of their subsidiaries. These platforms are owned and operated by their respective companies, and their use is subject to their own terms of service and privacy policies. You are responsible for complying with the terms of any third-party platforms you connect to the Service.
          </p>
          <p className="text-muted-foreground">
            We are not responsible for any actions taken by third-party platforms, including but not limited to account suspensions, data access changes, API modifications, or service disruptions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">6. Artificial Intelligence Disclaimer</h2>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-muted-foreground font-medium mb-2">
              IMPORTANT: Please read this section carefully.
            </p>
            <p className="text-muted-foreground">
              The Service utilizes artificial intelligence (&quot;AI&quot;) technology to provide insights, analysis, and recommendations. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>
                <strong>AI outputs are not guaranteed to be accurate, complete, or reliable.</strong> AI systems may produce errors, hallucinations, or incorrect information. You should independently verify any AI-generated content before relying on it for business decisions.
              </li>
              <li>
                <strong>AI is not a substitute for professional advice.</strong> The AI-generated insights do not constitute financial, legal, tax, or professional business advice. You should consult qualified professionals before making significant business decisions.
              </li>
              <li>
                <strong>You bear full responsibility for actions taken based on AI outputs.</strong> The Company is not liable for any losses, damages, or consequences resulting from decisions made based on AI-generated content or recommendations.
              </li>
              <li>
                <strong>AI capabilities and limitations may change.</strong> The underlying AI models, their capabilities, and their limitations may change without notice as the technology evolves.
              </li>
              <li>
                <strong>AI may take actions on your connected accounts.</strong> When you authorize the AI to perform actions (such as creating or modifying ad units, campaigns, or settings), you accept full responsibility for the consequences of those actions. You should review the tool approval prompts carefully before authorizing any action.
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">7. User Responsibilities</h2>
          <p className="text-muted-foreground">
            By using the Service, you agree to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
            <li>Verify and validate any AI-generated outputs before acting upon them</li>
            <li>Maintain appropriate backups of your data and account configurations</li>
            <li>Comply with all applicable laws, regulations, and third-party platform policies</li>
            <li>Not use the Service in any way that could damage, disable, or impair the Service</li>
            <li>Not attempt to gain unauthorized access to any part of the Service or related systems</li>
            <li>Not use automated means (bots, scrapers) to access the Service without our written consent</li>
            <li>Not use the Service to engage in any fraudulent, deceptive, or manipulative advertising practices</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">8. Prohibited Uses</h2>
          <p className="text-muted-foreground">
            You may not use the Service to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights of others</li>
            <li>Engage in click fraud, ad fraud, or any form of advertising manipulation</li>
            <li>Circumvent any security measures or access restrictions</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Resell, sublicense, or provide the Service to third parties without authorization</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Collect or harvest user information without consent</li>
            <li>Transmit malware, viruses, or other harmful code</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">9. Intellectual Property</h2>
          <p className="text-muted-foreground">
            The Service, including its original content, features, and functionality, is owned by KV Labs and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
          <p className="text-muted-foreground">
            You retain ownership of any data you provide to the Service, including your advertising account data. By using the Service, you grant us a limited, non-exclusive license to process your data solely for the purpose of providing the Service.
          </p>
          <p className="text-muted-foreground">
            We do not claim ownership of AI-generated outputs based on your data. However, we make no representations regarding the intellectual property status of AI-generated content, and you are responsible for ensuring your use of such content complies with applicable laws.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">10. Subscription and Billing</h2>
          <p className="text-muted-foreground">
            Certain features of the Service may require a paid subscription. By subscribing, you agree to pay all applicable fees as described at the time of purchase. Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on your plan).
          </p>
          <p className="text-muted-foreground">
            Refunds are handled in accordance with our refund policy and applicable law. We reserve the right to change pricing with reasonable notice. Continued use after a price change constitutes acceptance of the new pricing.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">11. Disclaimer of Warranties</h2>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-muted-foreground uppercase font-medium mb-2">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
            </p>
            <p className="text-muted-foreground">
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT</li>
              <li>WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS</li>
              <li>WARRANTIES REGARDING THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY CONTENT OR INFORMATION PROVIDED THROUGH THE SERVICE</li>
              <li>WARRANTIES THAT THE SERVICE WILL MEET YOUR SPECIFIC REQUIREMENTS OR EXPECTATIONS</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              YOU USE THE SERVICE AT YOUR OWN RISK. WE DO NOT WARRANT THAT THE AI FEATURES WILL PRODUCE ACCURATE, RELIABLE, OR BENEFICIAL RESULTS.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">12. Limitation of Liability</h2>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL KV LABS, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, PARTNERS, OR AFFILIATES BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
              <li>ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES</li>
              <li>ANY DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE</li>
              <li>ANY DAMAGES ARISING FROM AI-GENERATED CONTENT, RECOMMENDATIONS, OR ACTIONS</li>
              <li>ANY DAMAGES ARISING FROM UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR DATA</li>
              <li>ANY DAMAGES ARISING FROM THIRD-PARTY PLATFORM ACTIONS, INCLUDING ACCOUNT SUSPENSIONS OR API CHANGES</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
            <p className="text-muted-foreground mt-2">
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF THESE LAWS APPLY TO YOU, SOME OR ALL OF THE ABOVE EXCLUSIONS OR LIMITATIONS MAY NOT APPLY, AND YOU MAY HAVE ADDITIONAL RIGHTS.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">13. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify, defend, and hold harmless KV Labs and its officers, directors, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights, including intellectual property rights</li>
            <li>Your violation of any applicable laws or regulations</li>
            <li>Any actions taken by the AI at your direction or with your approval</li>
            <li>Any content or data you provide to the Service</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">14. Termination</h2>
          <p className="text-muted-foreground">
            We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including but not limited to breach of these Terms.
          </p>
          <p className="text-muted-foreground">
            You may terminate your account at any time through your account settings. Upon termination, your right to use the Service will immediately cease. Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, indemnification, and limitations of liability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">15. Governing Law and Dispute Resolution</h2>
          <p className="text-muted-foreground">
            These Terms shall be governed by and construed in accordance with the laws of Italy, without regard to its conflict of law provisions.
          </p>
          <p className="text-muted-foreground">
            Any dispute arising out of or relating to these Terms or the Service shall first be attempted to be resolved through good-faith negotiation. If the dispute cannot be resolved through negotiation within thirty (30) days, either party may pursue resolution through the courts of competent jurisdiction in Italy.
          </p>
          <p className="text-muted-foreground">
            For users in the European Union, nothing in these Terms affects your rights under mandatory consumer protection laws in your country of residence.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">16. Severability</h2>
          <p className="text-muted-foreground">
            If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such invalidity shall not affect the validity of the remaining provisions, which shall continue in full force and effect.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">17. Waiver</h2>
          <p className="text-muted-foreground">
            Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver of any provision of these Terms will be effective only if in writing and signed by an authorized representative of KV Labs.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">18. Entire Agreement</h2>
          <p className="text-muted-foreground">
            These Terms, together with our Privacy Policy and any other legal notices or policies published on the Service, constitute the entire agreement between you and KV Labs regarding the Service and supersede all prior agreements, understandings, and communications, whether written or oral.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">19. Assignment</h2>
          <p className="text-muted-foreground">
            You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may assign these Terms without restriction. Any attempted assignment in violation of this section shall be null and void.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">20. Force Majeure</h2>
          <p className="text-muted-foreground">
            We shall not be liable for any failure or delay in performing our obligations under these Terms due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, civil unrest, government actions, power failures, internet or telecommunications failures, or actions of third-party service providers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">21. Contact Information</h2>
          <p className="text-muted-foreground">
            If you have any questions about these Terms, please contact us:
          </p>
          <ul className="list-none text-muted-foreground space-y-1">
            <li><strong>Email:</strong> legal@kvlabs.io</li>
            <li><strong>Support:</strong> support@kovio.dev</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
