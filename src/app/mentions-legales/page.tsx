import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  Cookie,
  Database,
  ExternalLink,
  FileText,
  HardDrive,
  Heart,
  LockKeyhole,
  Mail,
  Scale,
  Server,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#151512]">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {/* Retour */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 dark:text-stone-400 dark:hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        {/* Introduction */}
        <section className="pb-12 pt-14 sm:pb-16 sm:pt-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Scale className="h-4 w-4" />
              Informations légales
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Mentions légales et confidentialité
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-stone-300 sm:text-lg">
              Cette page présente les informations relatives à Medecine Hub,
              à l&apos;utilisation de la plateforme et à la protection de vos
              données personnelles.
            </p>

            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-stone-400">
              Dernière mise à jour : mai 2026
            </p>
          </div>
        </section>

        <div className="space-y-6">
          {/* Éditeur du site */}
          <LegalSection
            icon={FileText}
            title="Éditeur du site"
            description="Informations relatives à la personne responsable de la publication."
          >
            <InfoGrid
              items={[
                ["Nom du site", "Medecine Hub"],
                ["Nature du projet", "Plateforme éducative gratuite"],
                ["Responsable de publication", "Nasim nz"],
                ["Statut", "Projet étudiant non commercial"],
              ]}
            />
          </LegalSection>

          {/* Hébergement */}
          <LegalSection
            icon={Server}
            title="Hébergement"
            description="Le site est hébergé par un prestataire externe assurant sa mise à disposition en ligne."
          >
            <InfoGrid
              items={[
                ["Hébergeur", "OnetSolutions"],
                ["Adresse", "1 Allée de l’Écluse, 33370 Yvrac, France"],
                [
                  "Téléphone",
                  "À compléter avec le numéro officiel de l’hébergeur",
                ],
              ]}
            />
          </LegalSection>

          {/* Objet de la plateforme */}
          <LegalSection
            icon={BookOpenCheck}
            title="Objet de la plateforme"
            description="Medecine Hub met gratuitement à disposition des contenus destinés à faciliter les révisions."
          >
            <ul className="space-y-3 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <Bullet>
                L&apos;utilisation du site est libre et ne nécessite pas de
                création de compte.
              </Bullet>

              <Bullet>
                Les annales et les QCM sont proposés à des fins pédagogiques et
                pour un usage personnel.
              </Bullet>

              <Bullet>
                Les corrections sont fournies à titre indicatif et peuvent
                contenir des erreurs malgré les efforts réalisés pour les
                vérifier.
              </Bullet>

              <Bullet>
                Toute reproduction ou distribution commerciale des contenus
                propres à la plateforme est interdite sans autorisation
                préalable.
              </Bullet>
            </ul>
          </LegalSection>

          {/* Avertissement médical */}
          <LegalSection
            icon={Stethoscope}
            title="Avertissement médical"
            description="Medecine Hub est un outil pédagogique et ne remplace aucune source médicale officielle."
          >
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                Les contenus proposés sur Medecine Hub sont destinés aux
                révisions académiques. Ils ne constituent pas des conseils
                médicaux, ne doivent pas être utilisés pour établir un
                diagnostic et ne remplacent pas les recommandations officielles,
                l&apos;avis d&apos;un professionnel de santé ou les supports
                pédagogiques de votre université.
              </p>
            </div>
          </LegalSection>

          {/* Propriété intellectuelle */}
          <LegalSection
            icon={ShieldCheck}
            title="Propriété intellectuelle"
            description="Les différents contenus présents sur le site ne relèvent pas tous du même régime."
          >
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <p>
                La structure du site, son interface et son code source sont
                protégés par le droit d&apos;auteur et appartiennent à leurs
                créateurs, sauf mention contraire.
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="font-semibold text-amber-950 dark:text-amber-100">
                  Concernant les annales
                </p>

                <p className="mt-2 text-amber-900 dark:text-amber-200">
                  Les annales et les questions présentes sur Medecine Hub sont
                  issues d&apos;examens officiels de DFASM1 et DFASM2 de
                  l&apos;Université de Toulouse. Elles sont mises à disposition
                  uniquement à des fins pédagogiques. Toute personne estimant
                  détenir des droits sur un contenu peut demander son retrait à
                  l&apos;aide du formulaire de contact.
                </p>
              </div>
            </div>
          </LegalSection>

          {/* Stockage local */}
          <LegalSection
            icon={HardDrive}
            title="Stockage local sur votre appareil"
            description="Certaines préférences sont enregistrées directement dans votre navigateur pour améliorer votre expérience."
          >
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <p>
                Medecine Hub peut utiliser le stockage local de votre navigateur
                — appelé <strong>localStorage</strong> — pour mémoriser certaines
                informations utiles, telles que votre progression dans les QCM
                ou votre préférence d&apos;affichage.
              </p>

              <p>
                Ces informations restent enregistrées sur votre propre appareil.
                Elles ne sont pas utilisées à des fins publicitaires, ne servent
                pas à établir un profil marketing et ne sont pas vendues à des
                tiers.
              </p>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-sm leading-6 text-blue-900 dark:text-emerald-200">
                  Vous pouvez supprimer ces données à tout moment depuis les
                  paramètres de votre navigateur. Cette suppression peut
                  réinitialiser votre progression enregistrée localement et vos
                  préférences d&apos;affichage.
                </p>
              </div>
            </div>
          </LegalSection>

          {/* Cookies */}
          <LegalSection
            icon={Cookie}
            title="Cookies et autres traceurs"
            description="La plateforme limite l'utilisation des traceurs au strict nécessaire."
          >
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <p>
                À la date de la dernière mise à jour de cette page, Medecine Hub
                n&apos;utilise pas de cookies publicitaires et ne dépose pas de
                traceurs destinés au suivi marketing ou au profilage des
                utilisateurs.
              </p>

              <p>
                Des cookies ou mécanismes techniques strictement nécessaires au
                fonctionnement, à la sécurité ou à la disponibilité du site
                peuvent toutefois être utilisés par l&apos;infrastructure
                technique. Ils ne sont pas exploités par Medecine Hub à des fins
                commerciales.
              </p>

              <p>
                Si des outils de mesure d&apos;audience, des contenus intégrés
                provenant de services tiers ou d&apos;autres traceurs non
                essentiels sont ajoutés ultérieurement, cette page sera mise à
                jour et un mécanisme de recueil du consentement sera mis en
                place lorsque cela est requis.
              </p>
            </div>
          </LegalSection>

          {/* Données personnelles */}
          <LegalSection
            icon={Database}
            title="Données personnelles"
            description="La consultation des annales ne nécessite aucune inscription."
          >
            <div className="space-y-5 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <p>
                La navigation sur Medecine Hub et l&apos;utilisation des QCM ne
                nécessitent pas la création d&apos;un compte utilisateur.
              </p>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Formulaire de contact
                </h3>

                <p className="mt-2">
                  Lorsque vous utilisez le formulaire de contact, les
                  informations que vous renseignez sont transmises afin de
                  permettre le traitement de votre demande et de vous répondre.
                </p>
              </div>

              <InfoGrid
                items={[
                  [
                    "Données concernées",
                    "Nom, adresse e-mail, sujet et contenu du message",
                  ],
                  [
                    "Finalité",
                    "Répondre à votre question, votre suggestion ou votre demande",
                  ],
                  [
                    "Base du traitement",
                    "Intérêt légitime à traiter les demandes reçues",
                  ],
                  [
                    "Destinataires",
                    "Responsable de Medecine Hub et prestataires techniques strictement nécessaires",
                  ],
                  [
                    "Durée de conservation",
                    "Temps nécessaire au traitement de la demande, puis suppression au plus tard 12 mois après le dernier échange, sauf obligation particulière",
                  ],
                ]}
              />

              <p>
                Ces données ne sont ni vendues ni utilisées pour vous envoyer
                des communications commerciales.
              </p>
            </div>
          </LegalSection>

          {/* Services externes */}
          <LegalSection
            icon={ExternalLink}
            title="Liens vers des services externes"
            description="Certains liens peuvent vous rediriger vers des sites exploités par des tiers."
          >
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <p>
                La page de soutien contient notamment un lien vers PayPal. Ce
                service externe dispose de ses propres règles de
                confidentialité. Medecine Hub ne transmet pas directement vos
                données à PayPal lorsque vous consultez simplement la
                plateforme.
              </p>

              <p>
                Lorsque vous cliquez sur un lien externe, vous quittez Medecine
                Hub. Nous vous invitons à consulter les conditions et la
                politique de confidentialité du service concerné.
              </p>
            </div>
          </LegalSection>

          {/* Droits */}
          <LegalSection
            icon={LockKeyhole}
            title="Vos droits"
            description="Vous pouvez demander des informations sur les données personnelles transmises via le formulaire de contact."
          >
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <p>
                Selon votre situation, vous pouvez demander l&apos;accès à vos
                données personnelles, leur rectification, leur effacement ou la
                limitation de leur traitement. Vous pouvez également vous
                opposer au traitement lorsqu&apos;un tel droit est applicable.
              </p>

              <p>
                Pour exercer vos droits ou poser une question relative à la
                confidentialité, utilisez le formulaire de contact.
              </p>

              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Mail className="h-4 w-4" />
                Nous contacter
              </Link>
            </div>
          </LegalSection>

          {/* Responsabilité */}
          <LegalSection
            icon={Scale}
            title="Limitation de responsabilité"
            description="La plateforme est fournie gratuitement et fait l'objet d'améliorations régulières."
          >
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-stone-300">
              <p>
                Medecine Hub s&apos;efforce de maintenir la plateforme
                accessible et de proposer des contenus utiles. Nous ne pouvons
                toutefois pas garantir :
              </p>

              <ul className="space-y-3">
                <Bullet>la disponibilité permanente du service ;</Bullet>

                <Bullet>
                  l&apos;exactitude absolue de l&apos;ensemble des contenus
                  pédagogiques ;
                </Bullet>

                <Bullet>
                  l&apos;absence totale d&apos;erreurs techniques ou
                  d&apos;interruptions temporaires.
                </Bullet>
              </ul>
            </div>
          </LegalSection>

          {/* Mise à jour */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-stone-800 dark:bg-[#1d1c18]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-200">
                <Heart className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Évolution de cette page
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-stone-300">
                  Ces informations peuvent être modifiées pour refléter
                  l&apos;évolution de Medecine Hub, l&apos;ajout de nouvelles
                  fonctionnalités ou les changements applicables à la
                  plateforme.
                </p>

                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-stone-400">
                  Dernière mise à jour : mai 2026
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function LegalSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-stone-800 dark:bg-[#1d1c18] sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-stone-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 px-4 dark:divide-stone-800 dark:border-stone-800 dark:bg-[#151512]/50">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 py-3.5 text-sm sm:grid-cols-[180px_1fr] sm:gap-4"
        >
          <dt className="font-semibold text-slate-900 dark:text-white">
            {label}
          </dt>

          <dd className="leading-6 text-slate-600 dark:text-stone-300">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-emerald-400" />
      <span>{children}</span>
    </li>
  );
}