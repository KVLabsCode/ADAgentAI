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
          <h2 className="text-xl font-medium">5. Data Retention and Deletion</h2>
          <p className="text-muted-foreground">
            We retain your personal data for as long as your account is active or as needed to provide you services.
          </p>
          <p className="text-muted-foreground">
            <strong>Account Deletion:</strong> When you delete your account through Settings, all personal data is permanently deleted immediately, including:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Chat conversations and messages</li>
            <li>Connected AdMob and Google Ad Manager account credentials (OAuth tokens)</li>
            <li>Personal profile information (name, email)</li>
            <li>Usage analytics and billing metrics linked to your identity</li>
            <li>Organization memberships</li>
            <li>Preferences and settings</li>
            <li>AI conversation state and checkpoints</li>
          </ul>
          <p className="text-muted-foreground">
            <strong>Anonymized Analytics:</strong> After account deletion, we retain anonymized, aggregate statistics (such as total number of users who have used our service and average usage patterns) for legitimate business purposes. This anonymous data cannot be used to identify you and complies with GDPR Article 89 (statistical purposes) and Recital 26 (anonymous information that does not relate to an identified or identifiable person).
          </p>
          <p className="text-muted-foreground">
            The anonymized data includes only aggregate counts (e.g., number of chat sessions, total messages) and boolean flags (e.g., whether a provider was connected) with no personally identifiable information. We use a random anonymous identifier that cannot be traced back to your original account.
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
          <h2 className="text-xl font-medium">7. Your GDPR Rights</h2>
          <p className="text-muted-foreground">
            If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have certain data protection rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>
              <strong>Right of Access (Article 15):</strong> You can view a summary of all data we hold about you in Settings → Account → Data Summary.
            </li>
            <li>
              <strong>Right to Data Portability (Article 20):</strong> You can download all your personal data in a machine-readable JSON format through Settings → Account → Export Your Data.
            </li>
            <li>
              <strong>Right to Rectification (Article 16):</strong> You can update your profile information, preferences, and settings at any time through your account settings.
            </li>
            <li>
              <strong>Right to Erasure (Article 17):</strong> You can permanently delete all your personal data through Settings → Account → Delete Account. This action cannot be undone.
            </li>
            <li>
              <strong>Right to Object (Article 21):</strong> You can disconnect your advertising accounts and revoke our access to your AdMob/Google Ad Manager data at any time.
            </li>
            <li>
              <strong>Right to Withdraw Consent:</strong> Where we rely on consent for processing, you can withdraw it at any time through your account settings.
            </li>
          </ul>
          <p className="text-muted-foreground">
            To exercise these rights, use the self-service tools in your account Settings or contact us at privacy@kvlabs.io. We will respond to your request within 30 days as required by GDPR.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">8. Legal Basis for Processing (GDPR)</h2>
          <p className="text-muted-foreground">
            We process your personal data under the following legal bases:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong>Performance of Contract:</strong> To provide you with the Service you requested</li>
            <li><strong>Consent:</strong> For connecting advertising platform accounts via OAuth</li>
            <li><strong>Legitimate Interests:</strong> For analytics and service improvement (anonymized data only)</li>
            <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">9. Data Transfers</h2>
          <p className="text-muted-foreground">
            Your data is primarily stored in secure data centers within the European Economic Area (EEA). If data is transferred outside the EEA, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses approved by the European Commission.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">10. Children's Privacy</h2>
          <p className="text-muted-foreground">
            Our Service is not intended for children under 16 years of age. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal data, please contact us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">11. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, regulatory, or operational reasons. We will notify you of significant changes via email or through the Service. Your continued use of the Service after changes become effective constitutes acceptance of the revised Privacy Policy.
          </p>
          <p className="text-muted-foreground">
            The "Last updated" date at the top of this policy indicates when it was last revised.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">12. Data Protection Officer</h2>
          <p className="text-muted-foreground">
            For GDPR-related inquiries, you can contact our Data Protection Officer at: dpo@kvlabs.io
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">13. Supervisory Authority</h2>
          <p className="text-muted-foreground">
            If you are located in the EEA and believe we have not adequately addressed your concerns, you have the right to lodge a complaint with your local data protection supervisory authority.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">14. Contact</h2>
          <p className="text-muted-foreground">
            For questions about this Privacy Policy, your data rights, or to exercise your GDPR rights, please contact us:
          </p>
          <ul className="list-none text-muted-foreground space-y-1">
            <li>Email: privacy@kvlabs.io</li>
            <li>Data Protection Officer: dpo@kvlabs.io</li>
            <li>GDPR Requests: Use the self-service tools in Settings → Account</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
