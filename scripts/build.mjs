import { command, directory, file } from "@ewam/script.cli"
import Path from "path"

const package_dir = "./dist"

const package_json = {
   ...file.read.json("./package.json"),
   private: false,
   publishConfig: {
      "access": "restricted"
   },
   scripts: undefined,
   devDependencies: undefined,
}

const npmignore = `
node_modules
package-lock.json
*.tgz
*.map
`

directory.remove(package_dir)
command.exec("ttsc")
file.write.json(`${package_dir}/package.json`, package_json)
file.write.text(`${package_dir}/.npmignore`, npmignore)

const archName = command.read.exec(`npm pack`, { cwd: package_dir }).trim()
file.move.toDir(Path.resolve(`${package_dir}/${archName}`), ".")
