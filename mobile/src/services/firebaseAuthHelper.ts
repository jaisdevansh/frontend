import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

/**
 * Helper to store the Firebase confirmation object between screens.
 * Expo Router params only support strings, so we use this singleton.
 */
class FirebaseAuthHelper {
    private confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
    private phoneNumber: string | null = null;

    setConfirmation(confirmation: FirebaseAuthTypes.ConfirmationResult, phoneNumber: string) {
        this.confirmation = confirmation;
        this.phoneNumber = phoneNumber;
    }

    getConfirmation() {
        return this.confirmation;
    }

    getPhoneNumber() {
        return this.phoneNumber;
    }

    clear() {
        this.confirmation = null;
        this.phoneNumber = null;
    }
}

export const firebaseAuthHelper = new FirebaseAuthHelper();
