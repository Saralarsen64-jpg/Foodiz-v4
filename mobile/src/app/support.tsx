import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  WeelloButton,
  WeelloCard,
  WeelloField,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  open: 'Reçue',
  in_progress: 'En cours',
  resolved: 'Résolue',
  closed: 'Clôturée',
};

export default function SupportScreen() {
  const { session } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sending, setSending] = useState(false);

  async function loadTickets() {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('id,subject,status,priority,created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setTickets((data || []) as Ticket[]);
  }

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    void supabase
      .from('support_tickets')
      .select('id,subject,status,priority,created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active) setTickets((data || []) as Ticket[]);
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  async function submit() {
    if (!session?.user.id || subject.trim().length < 4 || message.trim().length < 10) {
      Alert.alert(
        'Précisez votre demande',
        'Ajoutez un sujet et un message suffisamment détaillé.',
      );
      return;
    }
    setSending(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: session.user.id,
      subject: subject.trim(),
      message: message.trim(),
      status: 'open',
      priority: 'normal',
    });
    setSending(false);
    if (error) {
      Alert.alert('Envoi impossible', error.message);
      return;
    }
    setSubject('');
    setMessage('');
    await loadTickets();
    Alert.alert(
      'Demande envoyée',
      'L’équipe Weello peut maintenant suivre et traiter votre demande.',
    );
  }

  return (
    <WeelloScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Retour</Text>
      </Pressable>
      <Text style={styles.kicker}>CENTRE D’AIDE WEELLO</Text>
      <Text style={weelloText.title}>Comment peut-on vous aider ?</Text>
      <Text style={weelloText.body}>
        Chaque demande est enregistrée et suivie depuis l’administration Weello.
      </Text>

      <WeelloCard>
        <Text style={weelloText.heading}>Nouvelle demande</Text>
        <WeelloField
          value={subject}
          onChangeText={setSubject}
          placeholder="Sujet"
          autoCapitalize="sentences"
        />
        <WeelloField
          value={message}
          onChangeText={setMessage}
          placeholder="Expliquez précisément ce qui se passe"
          autoCapitalize="sentences"
          multiline
        />
        <WeelloButton
          label="Envoyer au support"
          onPress={() => void submit()}
          loading={sending}
        />
      </WeelloCard>

      <Text style={weelloText.heading}>Mes demandes</Text>
      {tickets.length === 0 ? (
        <WeelloCard>
          <Text style={weelloText.body}>Aucune demande en cours.</Text>
        </WeelloCard>
      ) : (
        tickets.map((ticket) => (
          <WeelloCard key={ticket.id}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.status}>
                {statusLabels[ticket.status] || ticket.status}
              </Text>
            </View>
            <Text style={styles.date}>
              {new Date(ticket.created_at).toLocaleString('fr-FR')}
            </Text>
          </WeelloCard>
        ))
      )}
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  ticketHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  ticketSubject: {
    color: colors.cream,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  status: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  date: { color: colors.muted, fontSize: 11 },
});
