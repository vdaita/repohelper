import { Text, Container, Button, Center, Box} from "@mantine/core";
import Link from "next/link";

export default function Homepage() {
    return (
        <Container>
            <Center mah={400}>
                <Box>
                    <Text size="xl">superdocs</Text>
                    <Link href={"/auth"}>Login</Link>
                </Box>
            </Center>
        </Container>
    )
}