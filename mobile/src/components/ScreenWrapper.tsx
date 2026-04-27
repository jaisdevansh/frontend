import React from "react";
import { StyleSheet, Platform, ScrollView, View, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenWrapperProps {
    children: React.ReactNode;
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
                // ✅ APK-compatible fix:
                // iOS = 'padding' (standard)
                // Android = 'height' (works with softwareKeyboardLayoutMode: resize in app.json)
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.scrollContent,
                        extraBottomPadding > 0 && { paddingBottom: extraBottomPadding },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    automaticallyAdjustKeyboardInsets={true}
                >
                    <View style={styles.contentWrap}>
                        {children}
                    </View>
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
        flexGrow: 1,
        paddingBottom: 40,
    },
    contentWrap: {
        flexGrow: 1,
    }
});
