import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | Ad Agent AI",
  description: "Privacy Policy for Ad Agent AI platform",
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold mb-8">Privacy Policy</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground">
          Last updated: January 2025
        </p>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">1. Information We Collect</h2>
          <p className="text-muted-foreground">
            We collect information you provide directly, including your name and email address when you
            create an account via Google OAuth. We also collect advertising data from connected platforms
            when you authorize access.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">2. How We Use Your Information</h2>
          <p className="text-muted-foreground">
            We use your information to provide the Service, including analyzing your advertising data
            and generating insights. We do not sell your personal information to third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">3. Data from Advertising Platforms</h2>
          <p className="text-muted-foreground">
            When you connect your AdMob or Google Ad Manager accounts, we access your account data
            through official APIs. This data is used solely to provide you with insights and is not
            shared with third parties. We do not store your OAuth credentials - only secure refresh tokens.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">4. Data Security</h2>
          <p className="text-muted-foreground">
            We implement appropriate technical and organizational measures to protect your data.
            All data is transmitted over encrypted connections (HTTPS) and stored securely.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">5. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your data for as long as your account is active. You can request deletion of
            your data at any time by contacting us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">6. Third-Party Services</h2>
          <p className="text-muted-foreground">
            We use trusted third-party services for authentication (Google OAuth), analytics, and
            infrastructure. These services have their own privacy policies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">7. Your Rights</h2>
          <p className="text-muted-foreground">
            You have the right to access, correct, or delete your personal data. You can also
            disconnect your advertising accounts at any time through your account settings.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">8. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes via email or through the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">9. Contact</h2>
          <p className="text-muted-foreground">
            For questions about this Privacy Policy or your data, please contact us at privacy@kvlabs.io
          </p>
        </section>
      </div>
    </div>
  )
}
