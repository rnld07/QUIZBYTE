import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { IconButton, Screen, SectionHeading, Text } from '@/components/ui';
import { makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

/**
 * Was ein Tarif kann.
 *
 * Als Liste an einer Stelle, damit sich der Umfang ändern lässt, ohne die Seite
 * anzufassen. `soon` markiert, was es noch gar nicht gibt – eine Zeile, die
 * etwas verspricht, das nicht existiert, ist genau das, was man auf einer
 * Abo-Seite nicht schreiben sollte.
 */
interface Perk {
  label: string;
  free: boolean;
  premium: boolean;
  /** Steht auch im Premium-Tarif noch aus. */
  soon?: boolean;
}

const PERKS: readonly Perk[] = [
  // Die drei, um die es geht – und die drei, die es noch nicht gibt. Weder das
  // Quizlimit noch die Lernzettel-Freischaltung ist heute irgendwo umgesetzt.
  { label: 'Unbegrenzt Quiz spielen', free: false, premium: true, soon: true },
  // Kategorien tragen in der Datenbank schon ein `requires_pro`, das bisher
  // niemand einlösen kann.
  { label: 'Alle Kategorien freigeschaltet', free: false, premium: true },
  { label: 'Ein kostenpflichtiger Lernzettel pro Monat', free: false, premium: true, soon: true },

  { label: 'Tagesquiz, Tagesaufgaben und Glücksrad', free: true, premium: true },
  { label: 'Freunde, Duelle und geteilte Fragen', free: true, premium: true },
  { label: 'Freie Lernzettel ansehen und als PDF speichern', free: true, premium: true },
  { label: 'Fortschritt, Medaillen und Profilrahmen', free: true, premium: true },
];

/**
 * Die beiden Abrechnungszeiträume.
 *
 * Platzhalter, bis im Store etwas hinterlegt ist. Die Ersparnis wird gerechnet
 * und nicht danebengeschrieben – so kann sie nicht falsch werden, wenn einer
 * der beiden Preise sich ändert.
 */
const BILLING = {
  monthly: { label: 'Monatlich', price: 3.99, period: 'pro Monat' },
  yearly: { label: 'Jährlich', price: 39.99, period: 'pro Jahr' },
} as const;

type Billing = keyof typeof BILLING;

const euro = (value: number): string => `${value.toFixed(2).replace('.', ',')} €`;

/** Wie viel Prozent das Jahresabo gegenüber zwölf Monaten spart. */
const YEARLY_SAVING = Math.round((1 - BILLING.yearly.price / (BILLING.monthly.price * 12)) * 100);

type Plan = 'free' | 'premium';

/**
 * Der laufende Tarif.
 *
 * Noch nichts dahinter: es gibt keine Abo-Tabelle und keinen Zahlungsweg.
 * Als Funktion und nicht als Konstante, damit die Seite mit beiden Fällen
 * übersetzt – eine Konstante `'free'` engt den Typ so weit ein, dass der
 * Premium-Zweig als toter Code gilt und gar nicht erst geprüft wird.
 */
function currentPlan(): Plan {
  return 'free';
}

/**
 * Mein Abo.
 *
 * Ein Entwurf: die Seite zeigt, wie die beiden Tarife nebeneinander aussehen,
 * aber es gibt nichts zu kaufen. Kein Preis, kein Kaufknopf, der ins Leere
 * führt, und der laufende Tarif ist fest "Free" – es gibt noch keinen Ort, an
 * dem etwas anderes stehen könnte.
 *
 * Wenn es so weit ist, sind es zwei Stellen: `currentPlan()` liest den echten
 * Zustand, und der Knopf am Fuß bekommt etwas zu tun.
 */
export default function SubscriptionScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();

  const plan = currentPlan();
  const [billing, setBilling] = useState<Billing>('yearly');
  const chosen = BILLING[billing];

  return (
    <Screen backdrop={<AmbientBackground />} scrollToTopKey="subscription">
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <View style={styles.titleText}>
          <Text variant="headline" style={styles.title}>
            Mein Abo
          </Text>
          <Text variant="caption" color="muted">
            Dein Tarif: {plan === 'free' ? 'Free' : 'Premium'}
          </Text>
        </View>
      </View>

      {/* Sagt offen, woran man ist. Eine Seite, die aussieht wie ein Shop und
          keiner ist, lässt Leute auf einen Knopf drücken, der nichts tut. */}
      <View style={styles.notice}>
        <Ionicons name="construct-outline" size={16} color={colors.warning} />
        <Text variant="caption" color="secondary" style={styles.noticeText}>
          Premium ist noch nicht verfügbar. Diese Seite zeigt, was geplant ist – kaufen lässt sich
          hier nichts.
        </Text>
      </View>

      {/*
        Untereinander statt nebeneinander: Free zählt nichts mehr auf, und zwei
        gleich hohe Kästen, von denen einer leer ist, sehen aus wie ein Fehler.
      */}
      <View style={styles.plans}>
        <PlanCard
          name="Free"
          tagline="Was QuizByte heute kann"
          price="0 €"
          period="dauerhaft"
          current={plan === 'free'}
        />

        <PlanCard
          name="Premium"
          tagline="Geplant"
          price={euro(chosen.price)}
          period={chosen.period}
          note={
            billing === 'yearly'
              ? `${euro(BILLING.yearly.price / 12)} im Monat · ${YEARLY_SAVING} % gespart`
              : undefined
          }
          highlight
          current={plan === 'premium'}
          // Nur das, was Premium zusätzlich kann. Was beide Tarife haben,
          // steht in der Tabelle darunter.
          perks={PERKS.filter((perk) => perk.premium && !perk.free)}
        >
          {/* Die Wahl gehört in die Premium-Karte: Free hat keinen Zeitraum. */}
          <View style={styles.billing}>
            {(Object.keys(BILLING) as Billing[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => setBilling(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: billing === key }}
                accessibilityLabel={`${BILLING[key].label}, ${euro(BILLING[key].price)} ${BILLING[key].period}`}
                style={({ pressed }) => [
                  styles.billingOption,
                  billing === key && styles.billingOptionOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  variant="label"
                  style={[styles.billingText, billing === key && styles.billingTextOn]}
                >
                  {BILLING[key].label}
                </Text>
              </Pressable>
            ))}
          </View>
        </PlanCard>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Im Vergleich" />
        <View style={styles.table}>
          {PERKS.map((perk, index) => (
            <View key={perk.label} style={[styles.tableRow, index > 0 && styles.tableRowDivided]}>
              <Text variant="caption" style={styles.perkLabel}>
                {perk.label}
                {perk.soon ? (
                  <Text variant="label" color="muted">
                    {'  geplant'}
                  </Text>
                ) : null}
              </Text>
              <Mark on={perk.free} />
              <Mark on={perk.premium} />
            </View>
          ))}

          <View style={[styles.tableRow, styles.tableRowDivided]}>
            <Text variant="label" color="muted" style={styles.perkLabel}>
              {' '}
            </Text>
            <Text variant="label" color="muted" style={styles.markSlot}>
              Free
            </Text>
            <Text variant="label" color="muted" style={styles.markSlot}>
              Premium
            </Text>
          </View>
        </View>
      </View>

      {/* Deaktiviert und als solcher beschriftet – nicht ausgegraut mit einem
          Versprechen darauf. */}
      <Pressable
        disabled
        accessibilityRole="button"
        accessibilityLabel="Premium ist noch nicht verfügbar"
        accessibilityState={{ disabled: true }}
        style={styles.cta}
      >
        <Text variant="bodyStrong" color="muted">
          Bald verfügbar
        </Text>
      </Pressable>

      <Text variant="label" color="muted" align="center" style={styles.footnote}>
        {euro(chosen.price)} {chosen.period} (Platzhalter), jederzeit kündbar. Der Kauf läuft später
        über den App Store bzw. Google Play – dort lässt sich ein Abo auch wieder beenden.
      </Text>
    </Screen>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  period,
  note,
  perks,
  current,
  highlight = false,
  children,
}: {
  name: string;
  tagline: string;
  price: string;
  period: string;
  /** Zweite Zeile unter dem Preis – etwa die Ersparnis beim Jahresabo. */
  note?: string;
  /** Was dieser Tarif zusätzlich kann. Ohne Liste bleibt die Karte kompakt. */
  perks?: readonly Perk[];
  current: boolean;
  highlight?: boolean;
  /** Steht zwischen Preis und Liste – die Wahl des Zeitraums etwa. */
  children?: React.ReactNode;
}) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();

  return (
    <View style={[styles.plan, highlight && styles.planHighlight]}>
      {highlight ? (
        <View style={styles.planFill}>
          <LinearGradient
            colors={[`${colors.primary}26`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : (
        <View style={styles.planFill}>
          <LinearGradient
            colors={gradients.surface}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <View style={styles.planHead}>
        <Text variant="bodyStrong" style={styles.planName}>
          {name}
        </Text>
        {current ? (
          <View
            style={[
              styles.badge,
              { borderColor: colors.success, backgroundColor: colors.successSoft },
            ]}
          >
            <Text variant="label" style={{ color: colors.success }}>
              aktiv
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="label" color="muted">
        {tagline}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}</Text>
        <Text variant="label" color="muted" style={styles.period}>
          {period}
        </Text>
        {note ? (
          <Text variant="label" style={styles.note}>
            {note}
          </Text>
        ) : null}
      </View>

      {children}

      {/* Free zählt nichts auf: was die kostenlose Version kann, ist einfach
          die App – die Liste gehört dorthin, wo etwas dazukommt. */}
      {perks && perks.length > 0 ? (
        <View style={styles.perkList}>
          {perks.map((perk) => (
            <View key={perk.label} style={styles.perkRow}>
              <Ionicons
                name="checkmark"
                size={16}
                color={perk.soon ? colors.textMuted : colors.success}
              />
              <Text numberOfLines={2} style={[styles.perkText, perk.soon && styles.perkSoon]}>
                {perk.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Haken oder Strich in der Vergleichstabelle. */
function Mark({ on }: { on: boolean }) {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <View style={styles.markSlot}>
      {on ? (
        <Ionicons name="checkmark" size={16} color={colors.success} />
      ) : (
        <Text variant="label" color="muted">
          –
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  titleText: { flex: 1, gap: 1 },
  title: { letterSpacing: -0.3 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  noticeText: { flex: 1 },

  plans: { gap: spacing.sm },
  plan: {
    ...shadows.tile,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  planHighlight: { borderColor: colors.primary },
  planFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  planName: { fontSize: 16, color: colors.textPrimary },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  priceRow: { gap: 0, marginTop: spacing.xs, marginBottom: spacing.sm },
  price: { fontSize: 30, fontWeight: '900', lineHeight: 34, color: colors.textPrimary },
  period: { marginTop: 1 },
  note: { marginTop: 3, color: colors.success },

  /* Monat oder Jahr – eine Wahl aus zweien, deshalb Knöpfe und kein Schalter. */
  billing: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  billingOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfacePressed,
  },
  billingOptionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  billingText: { fontSize: 12, color: colors.textSecondary },
  billingTextOn: { color: colors.textPrimary, fontWeight: '700' },
  pressed: { opacity: 0.7 },

  perkList: { gap: spacing.sm },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  perkText: { flex: 1, fontSize: 14, lineHeight: 19, color: colors.textSecondary },
  perkSoon: { color: colors.textMuted },

  section: { gap: spacing.md, marginTop: spacing.xl },
  table: { borderRadius: radius.lg, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tableRowDivided: { borderTopWidth: 1, borderTopColor: colors.border },
  perkLabel: { flex: 1, color: colors.textSecondary },
  // Eine feste Spaltenbreite für Haken und Strich, damit beide Spalten
  // untereinander stehen und nicht mit der Länge der Zeile wandern.
  markSlot: { width: 56, alignItems: 'center' },

  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfacePressed,
  },
  footnote: { marginTop: spacing.sm, lineHeight: 15 },
}));
