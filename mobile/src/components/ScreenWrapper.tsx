import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    View,
    StyleSheet
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function ScreenWrapper({ children }: { children: React.ReactNode }) {
    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
        >
            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollGrow}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={140}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {children}
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1
    },
    scrollGrow: {
        flexGrow: 1
    }
});
