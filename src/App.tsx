import { Button } from '@heroui/react';
// import { invoke } from "@tauri-apps/api/core";
import { Layouts } from './layouts'

function App() {
  // const [greetMsg, setGreetMsg] = useState("");
  // const [name, setName] = useState("");
  //
  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <Layouts>
        <Button>
            My Button
        </Button>
    </Layouts>
  );
}

export default App;
