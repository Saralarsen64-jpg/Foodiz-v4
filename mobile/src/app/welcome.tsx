import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  WeelloActionCard,
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloHero,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { colors } from '@/theme/colors';

type PublicRole = 'client' | 'courier' | 'partner';

const ROLE_CARDS: {
  role: PublicRole;
  icon: string;
  title: string;
  description: string;
  promise: string;
}[] = [
  {
    role: 'client',
    icon: '🍽️',
    title: 'Client',
    description: 'Commander, suivre ma livraison et profiter du Weello Club.',
    promise: 'Une expérience simple, gourmande et suivie en direct.',
  },
  {
    role: 'courier',
    icon: '🚲',
    title: 'Livreur',
    description: 'Me connecter à mon espace courses, GPS, gains et disponibilités.',
    promise: 'Accès aux courses après validation du dossier Weello.',
  },
  {
    role: 'partner',
    icon: '🏪',
    title: 'Partenaire',
    description: 'Gérer les commandes, la carte, le dossier et les revenus.',
    promise: 'Un cockpit clair pour vendre localement avec Weello.',
  },
];

export default function WelcomeScreen() {
  const chooseRole = (role: PublicRole) => {
    router.push({
      pathname: '/login',
      params: { role },
    });
  };

  return (
    <WeelloScreen>
      <WeelloBrand subtitle="Une seule app, trois espaces Weello" />
      <WeelloHero
        eyebrow="Bienvenue"
        title="Vous êtes ?"
        body="Choisissez votre espace avant de vous connecter. Weello adapte l’expérience, les écrans et les permissions à votre rôle.">
        <View style={styles.heroNote}>
          <Text style={styles.heroNoteText}>
            L’admin reste sur le portail web sécurisé, pas dans l’app mobile.
          </Text>
        </View>
      </WeelloHero>

      <View style={styles.roles}>
        {ROLE_CARDS.map((item) => (
          <WeelloActionCard
            key={item.role}
            icon={item.icon}
            title={item.title}
            description={item.description}
            onPress={() => chooseRole(item.role)}
          />
        ))}
      </View>

      <WeelloCard>
        <Text style={styles.kicker}>POURQUOI CE CHOIX ?</Text>
        <Text style={weelloText.heading}>Plus simple pour vous, plus sécurisé pour Weello.</Text>
        <View style={styles.promiseList}>
          {ROLE_CARDS.map((item) => (
            <Text key={item.role} style={styles.promise}>
              • {item.title} : {item.promise}
            </Text>
          ))}
        </View>
      </WeelloCard>

      <WeelloButton
        label="Créer mon compte client"
        secondary
        onPress={() => router.push('/signup')}
      />
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  heroNote: {
    borderColor: 'rgba(216,168,79,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  heroNoteText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  roles: {
    gap: 10,
  },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  promiseList: {
    gap: 8,
    marginTop: 12,
  },
  promise: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
