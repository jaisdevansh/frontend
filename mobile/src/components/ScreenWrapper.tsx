import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenWrapperProps {
    children: React.ReactNode;
    /** Extra bottom padding for screens with CTAs near the bottom */
    extraBottomPadding?: number;
}

export default function ScreenWrapper({
    children,
    extraBottomPadding = 0,
}: ScreenWrapperProps) {
    return (
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                /**
                 * iOS  → "padding": grows the bottom offset so content shifts up
                 * Android → undefined: let native 'resize' mode physically squish the view
                 */
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        extraBottomPadding > 0 && { paddingBottom: extraBottomPadding },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    // Only iOS needs this inset auto-adjustment
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                >
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#000000",
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        // flexGrow:1 lets content expand to fill screen,
        // but does NOT force it to stay at full height —
        // so keyboard push actually works
        flexGrow: 1,
        paddingBottom: 40,
    },
});
