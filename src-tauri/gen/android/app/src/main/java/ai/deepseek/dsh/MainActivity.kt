package ai.deepseek.dsh

import android.content.Context
import android.os.Bundle
import android.util.Log
import androidx.activity.enableEdgeToEdge
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipInputStream

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    try {
      extractRuntime(this)
    } catch (error: Throwable) {
      // 解压失败不影响 UI 启动，错误会显示在启动页
      Log.e("dsh-app", "extract runtime failed", error)
    }
  }

  companion object {
    private const val TAG = "dsh-app"

    /**
     * 首次启动时把 assets/dsh-runtime.zip（node + dsh 运行时）解压到 files/dsh-runtime。
     * 幂等：目录存在且含 VERSION 文件则跳过；重复启动直接复用。
     */
    private fun extractRuntime(context: Context) {
      val target = File(context.filesDir, "dsh-runtime")
      val versionFile = File(target, "VERSION")
      if (versionFile.exists()) return

      val input = context.assets.open("dsh-runtime.zip")
      val temp = File(context.filesDir, "dsh-runtime.tmp")
      if (temp.exists()) temp.deleteRecursively()
      temp.mkdirs()

      val buffer = ByteArray(64 * 1024)
      ZipInputStream(input).use { zip ->
        var entry = zip.nextEntry
        while (entry != null) {
          val outFile = File(temp, entry.name)
          if (entry.isDirectory) {
            outFile.mkdirs()
          } else {
            outFile.parentFile?.mkdirs()
            BufferedOutputStream(FileOutputStream(outFile)).use { out ->
              var read = zip.read(buffer)
              while (read >= 0) {
                if (read > 0) out.write(buffer, 0, read)
                read = zip.read(buffer)
              }
            }
          }
          zip.closeEntry()
          entry = zip.nextEntry
        }
      }

      // 给 node 可执行权限（assets 解压后无 exec 位）
      File(temp, "node").setExecutable(true, false)

      if (target.exists()) target.deleteRecursively()
      if (!temp.renameTo(target)) {
        throw IllegalStateException("rename runtime dir failed")
      }
      Log.i(TAG, "dsh runtime extracted to ${target.absolutePath}")
    }
  }
}
