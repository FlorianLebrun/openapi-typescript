import { command, file } from "@ewam/script.cli"

try {
   command.exec("ttsc")
}
catch (e) {
   console.error(e)
}
