import { View, StyleSheet, ScrollView } from "react-native";
import TimeLineCard from "@/app/components/common/TimeLineCard";

const dummyTimelinePosts = [
    {
        id: 1,
        title: "손상원 클라이밍 판교점",
        subtitle: "엄청 다이나믹한 암장이었다 (사실 이지 브로)",
        date: "2024. 10. 08.",
        author: "벽타는 낙타",
        imageUrl: require("@/assets/images/climbing.png"),
        color: '#735BF2'
    },
    {
        id: 2,
        title: "손상원 클라이밍 판교점",
        subtitle: "오늘은 좀 힘들었다.",
        date: "2024. 10. 08.",
        author: "벽타는 낙타",
        imageUrl: require("@/assets/images/climbing.png"),
        color: '#E31A1A'
    },
    {
        id: 3,
        title: "손상원 클라이밍 분당점",
        subtitle: "오늘은 아쉬웠다.",
        date: "2024. 09. 08.",
        author: "벽타는 낙타",
        imageUrl: require("@/assets/images/climbing.png"),
        color: '#E31A1A'
    },
];

export default function TimeLinePage() {
    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.cardsContainer}>
                    {dummyTimelinePosts.map((post) => (
                        <TimeLineCard key={post.id} post={post} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: 'white',
    },
    scrollView: {
        flex: 1,
    },
    cardsContainer: {
        padding: 16,
    },
});