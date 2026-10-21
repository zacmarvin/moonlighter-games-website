import './PrivacyPolicy.css'

// The policy reads these; the effective date changes with every edit of the text
const LEGAL_NAME = 'Zachary Marvin'
const GAMEPLAY_RECORD_RETENTION = '24 months'
const EFFECTIVE_DATE = 'October 21, 2026'
const CONTACT_EMAIL = 'info@moonlightergames.com'

const ExternalLink = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">{href}</a>
)

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

const PrivacyPolicy = () => {
  return (
    <div className="privacy-page">
      <section className="privacy-hero">
        <h1>Privacy Policy</h1>
        <p className="privacy-subtitle">Nanoplanet Survivors and Moonlighter Games</p>
        <p className="privacy-date">Effective date: {EFFECTIVE_DATE}</p>
      </section>

      <article className="privacy-content">
        <p>
          This policy explains what information Nanoplanet Survivors (the "game") collects, why, who it is shared with,
          and the choices you have. It applies to the game on Android, iOS (iPhone and iPad) and PC (Steam), and to the
          Moonlighter Games website.
        </p>

        <h2>Who we are</h2>
        <p>
          Moonlighter Games is an independent game studio run by {LEGAL_NAME} ("we", "us"). For anything about this policy
          or your data, email <Email />.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>There are no accounts. We never ask for your name, email, phone number or payment details in the game.</li>
          <li>The game has no in-app purchases.</li>
          <li>
            On phones and tablets the game shows ads only when you choose to watch one. The ads come from Google AdMob,
            which collects device and usage information to serve and measure ads. Where the law requires it, you are
            asked for consent first, and you can change your choice in the game's Settings.
          </li>
          <li>
            On iOS the game does not ask for permission to track you and does not access your device's advertising
            identifier (IDFA).
          </li>
          <li>
            The game may send a summary of each finished run (stage, time, score-type stats) so we can balance the game.
            On phones and tablets it carries only a random identifier; on PC it is tagged with your Steam ID.
          </li>
          <li>Your progress is saved on your device.</li>
        </ul>

        <h2>What we collect and why</h2>

        <h3>1. Gameplay statistics (all platforms)</h3>
        <p>
          When a run ends, the game may send one record of that run to our database, hosted by Google Firebase (Firebase
          Realtime Database, servers in the United States). The record contains:
        </p>
        <ul>
          <li>
            the stage, the time survived, the level reached, the gold and pet treats earned, and the number of enemies
            defeated;
          </li>
          <li>the abilities you used, with their level, damage and time equipped;</li>
          <li>
            on phones and tablets: whether you took the optional Random Buff and whether the Extra Life ad was offered
            and watched;
          </li>
          <li>
            an identifier for the player:
            <ul>
              <li>
                <strong>on phones and tablets</strong>, a random identifier the game creates on first launch (for
                example <code>android-</code> followed by random letters and digits). It is not your device's
                advertising identifier, it is not linked to your name or any account. Uninstalling the game normally
                removes it; on Android, if your device's backup is turned on, it can be restored with your save when you
                reinstall;
              </li>
              <li>
                <strong>on PC (Steam)</strong>, your Steam ID, a number that identifies your Steam account;
              </li>
            </ul>
          </li>
          <li>the time the record was received.</li>
        </ul>
        <p>
          Firebase also processes your IP address and basic device and browser information when the game connects, to
          run and secure the service.
        </p>
        <p>
          <strong>Why:</strong> to see how runs go (which stages are too hard, which abilities are too strong) and to fix
          and balance the game. Our legal basis, where one is needed, is our legitimate interest in improving the game.
          We do not use these records for advertising and we do not sell them.
        </p>
        <p>If the game cannot connect (for example, offline), nothing is sent and the game works as usual.</p>

        <h3>2. Advertising (Android and iOS only)</h3>
        <p>
          The game offers two optional rewarded ads: <strong>Extra Life</strong> (once per run, a revive after you lose)
          and <strong>Random Buff</strong> (before a round, one random bonus for that run). An ad plays only after you
          tap Watch Ad. Saying no changes nothing else, and the reward is the same whatever you answer to the consent
          questions below.
        </p>
        <p>
          The ads are provided by <strong>Google AdMob</strong> (Google LLC). To start and serve ads, the Google Mobile
          Ads SDK in the game collects and shares with Google, over encrypted connections:
        </p>
        <ul>
          <li>
            device identifiers: on Android, the advertising ID and the app set ID; on iOS, an identifier limited to apps
            from the same developer (the IDFV). The game never asks for permission to track you on iOS, so the IDFA is
            not available to it or to Google;
          </li>
          <li>
            your IP address, which can be used to estimate your general location (city or region, never precise
            location);
          </li>
          <li>how you interact with ads (which ads were shown, launches, taps, video views);</li>
          <li>
            diagnostic information about the app and the SDK (for example launch time and performance; crash
            information on iOS).
          </li>
        </ul>
        <p>
          Google may link this information to other information it holds about you. It uses it to show ads, measure
          them, prevent fraud and improve its services, as described in Google's own policies:{' '}
          <ExternalLink href="https://policies.google.com/privacy" /> and "How Google uses information from sites or apps
          that use our services" (<ExternalLink href="https://policies.google.com/technologies/partner-sites" />).
        </p>
        <p>We ask AdMob to show only ads suitable for teens (content rating "T").</p>
        <p>
          <strong>Consent.</strong> The game uses Google's consent tool (the User Messaging Platform):
        </p>
        <ul>
          <li>
            in the <strong>European Economic Area, the United Kingdom and Switzerland</strong>, the game asks for your
            consent before ads can be personalized. If you don't consent, Google may still show non-personalized ads,
            which use limited data (for example your general location and the app's context) for delivery, measurement
            and fraud prevention;
          </li>
          <li>
            in <strong>US states with privacy laws</strong>, you can opt out of the "sale" or "sharing" of your
            information for targeted advertising;
          </li>
          <li>
            where these choices apply, a <strong>Privacy Options</strong> button in the game's <strong>Settings</strong>{' '}
            lets you see and change them at any time.
          </li>
        </ul>
        <p>
          You can also limit ads on your device: on Android, <strong>Settings &gt; Privacy &gt; Ads</strong> (reset or
          delete your advertising ID); on iOS, the game does not use the advertising identifier.
        </p>

        <h3>3. Steam (PC only)</h3>
        <p>
          On PC the game runs through Steam (Valve Corporation). The game reads your Steam ID and uses Steam to unlock
          achievements, and Steam may back up your save through Steam Cloud if Steam Cloud is turned on for the game.
          Valve's handling of your data is covered by the Steam Privacy Policy:{' '}
          <ExternalLink href="https://store.steampowered.com/privacy_agreement/" />. The game also includes your Steam ID
          in the gameplay statistics described in section 1.
        </p>

        <h3>4. Information stored on your device</h3>
        <p>
          Your progress (unlocks, gold, settings, the selected character) is saved on your device, in the game's own
          storage. It is not sent to us. Uninstalling the game normally deletes it. On Android, if your device's backup
          is turned on, Android may back it up to your Google account and restore it when you reinstall; on PC, Steam
          Cloud may keep a copy, as described above.
        </p>

        <h3>5. Links</h3>
        <p>
          The game has a button to our Discord community, and on PC links to our games on Steam. They open in your
          browser or the Steam client, under those services' own privacy policies.
        </p>

        <h3>6. Our website</h3>
        <p>
          If you use the contact form on moonlightergames.com, your name, email and message are sent to us through
          Formspree. If you sign up for our newsletter, your email address is stored with Mailchimp (Intuit). We use them
          only to reply to you and to send the newsletter, and you can unsubscribe from any newsletter email. The site is
          hosted on Firebase Hosting, which processes your IP address to deliver the pages.
        </p>

        <h2>What we don't do</h2>
        <ul>
          <li>We don't create accounts or ask for your name, email or phone number in the game.</li>
          <li>We don't collect precise location, contacts, photos, files, or anything from your microphone or camera.</li>
          <li>We don't sell your personal information for money.</li>
          <li>We don't track you across other companies' apps and websites on iOS.</li>
        </ul>

        <h2>Who we share data with</h2>
        <ul>
          <li><strong>Google</strong> (Firebase, as our service provider; AdMob, as described in section 2).</li>
          <li><strong>Valve</strong> (Steam), on PC.</li>
          <li><strong>Formspree and Mailchimp</strong>, only for the website forms.</li>
          <li>Authorities, if the law requires it.</li>
          <li>
            A buyer or successor, if the game or the studio is ever sold or transferred; this policy would still apply to
            data collected under it.
          </li>
        </ul>

        <h2>How long we keep data</h2>
        <ul>
          <li>
            Gameplay records: for up to {GAMEPLAY_RECORD_RETENTION}, then deleted or kept only in aggregate form that no
            longer contains the player identifier.
          </li>
          <li>Data held by Google, Valve, Formspree and Mailchimp: as described in their policies.</li>
          <li>Data on your device: until you delete the game.</li>
          <li>Emails you send us: as long as needed to answer you.</li>
        </ul>

        <h2>Your rights and choices</h2>
        <p>
          Depending on where you live (for example under the GDPR in the EEA and UK, or under US state laws such as
          California's), you may have the right to ask what data we hold about you, to get a copy, to correct or delete
          it, to object to or restrict its use, and to complain to your data protection authority.
        </p>
        <ul>
          <li>
            <strong>Ads:</strong> use the Privacy Options button in Settings (where offered) or your device settings, as
            above.
          </li>
          <li>
            <strong>Gameplay records:</strong> email <Email />.
            <ul>
              <li>On PC, include your Steam ID and we will delete the records tagged with it.</li>
              <li>
                On phones, we can't tell which records are yours, because they carry only a random identifier that the
                game doesn't show and that we can't link to you. Uninstalling the game normally removes that identifier,
                so later records can't be linked to earlier ones (unless Android's device backup restores it when you
                reinstall).
              </li>
            </ul>
          </li>
          <li>
            <strong>Ads data held by Google:</strong> see <ExternalLink href="https://policies.google.com/privacy" /> and
            your Google or device settings.
          </li>
        </ul>
        <p>We will answer within 30 days and won't treat you differently for using these rights.</p>

        <h2>Children</h2>
        <p>
          The game is not directed at children under 13 (it is offered to ages 13 and up), and we don't knowingly collect
          personal information from children under 13. The game's ads are not set up for children. If you believe a
          child under 13 has given us personal information (for example by email), contact us and we will delete it.
        </p>

        <h2>Security</h2>
        <p>
          Data the game sends travels over encrypted (HTTPS/TLS) connections. No method of storage or transfer is
          completely secure, but we work to protect the data we hold.
        </p>

        <h2>International transfers</h2>
        <p>
          We and our providers may process data in the United States and other countries. Where the law requires it,
          these transfers rely on safeguards such as the European Commission's standard contractual clauses or the
          EU-US Data Privacy Framework used by our providers.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we change this policy, we will post the new version here with a new effective date. If a change is
          significant, we will also say so in the game or in the store notes.
        </p>

        <h2>Contact</h2>
        <p>
          Questions or requests: <Email />.
        </p>
      </article>
    </div>
  )
}

export default PrivacyPolicy
