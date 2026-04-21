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
                // METHOD 2: Using padding behavior on BOTH OS for explicit JS-controlled spacing in app.json "pan" mode.
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
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
