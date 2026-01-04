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
            By accessing and using Ad Agent AI ("Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">2. Description of Service</h2>
          <p className="text-muted-foreground">
            Ad Agent AI provides AI-powered tools to help manage and analyze your advertising accounts
            across platforms like Google AdMob and Google Ad Manager. We act as an interface between
            you and your advertising data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">3. User Accounts</h2>
          <p className="text-muted-foreground">
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activities that occur under your account. You must notify us immediately of any unauthorized use.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">4. API Access</h2>
          <p className="text-muted-foreground">
            When you connect your advertising accounts, you authorize us to access your account data via
            official APIs. We only access data necessary to provide the Service and do not store your
            credentials.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">5. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            The Service is provided "as is" without warranties of any kind. We are not liable for any
            indirect, incidental, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">6. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may update these Terms from time to time. Continued use of the Service after changes
            constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">7. Contact</h2>
          <p className="text-muted-foreground">
            For questions about these Terms, please contact us at support@kvlabs.io
          </p>
        </section>
      </div>
    </div>
  )
}
