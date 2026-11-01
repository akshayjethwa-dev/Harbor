// src/components/trust/TrustPrimerModal.tsx
import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { announce } from '../../lib/a11y';

interface TrustPrimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TrustPrimerModal({ visible, onClose }: TrustPrimerModalProps) {
  useEffect(() => {
    if (visible) {
      // Read the primer content aloud for screen-reader users
      announce(
        'Your Trust Balance helps everyone feel safe. Show up, score goes up. Communicate, score goes up. Host well, score goes up.'
      );
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>
            Your Trust Balance helps everyone feel safe
          </Text>
          <View style={styles.bullets}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>✅</Text>
              <Text style={styles.bulletText}>Show up → score goes up</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>💬</Text>
              <Text style={styles.bulletText}>Communicate → score goes up</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>🏠</Text>
              <Text style={styles.bulletText}>Host well → score goes up</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  bullets: {
    marginBottom: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  bulletText: {
    fontSize: 16,
    color: '#444',
    flex: 1,
  },
  button: {
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});