import os

path = r'c:\Users\devan\Downloads\stitch_curated_discovery\codebase\backend\controllers\user.controller.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Fix console.time warning (search for getProfile)
new_lines = []
for line in lines:
    if 'export const getProfile = async (req, res, next) => {' in line:
        new_lines.append(line)
        new_lines.append('        console.time(`getProfile-${req.user.id}`);\n')
    else:
        new_lines.append(line)

# 2. Find where to truncate (end of cancelBooking)
truncate_index = -1
for i, line in enumerate(new_lines):
    if "res.status(200).json({ success: true, message: 'Booking cancelled successfully' });" in line:
        # Looking for the next catch block closing
        for j in range(i, len(new_lines)):
            if '};' in new_lines[j] and 'export' not in new_lines[j]:
                truncate_index = j + 1
                break
        break

if truncate_index != -1:
    final_lines = new_lines[:truncate_index]
    
    # 3. Append clean controllers
    final_lines.append('\n')
    final_lines.append('export const submitBugReport = async (req, res, next) => {\n')
    final_lines.append('    try {\n')
    final_lines.append('        const { description, images, metadata } = req.body;\n')
    final_lines.append("        const user = await User.findById(req.user.id).select('name email username profileImage').lean();\n")
    final_lines.append('\n')
    final_lines.append('        let uploadedUrls = [];\n')
    final_lines.append('        if (images && images.length > 0) {\n')
    final_lines.append('            try {\n')
    final_lines.append("                const { uploadToCloudinary } = await import('../config/cloudinary.config.js');\n")
    final_lines.append("                uploadedUrls = await Promise.all(images.map(img => uploadToCloudinary(img, 'entry-club/bugs')));\n")
    final_lines.append("            } catch (cloudErr) { console.error('[Cloudinary] Upload Fail:', cloudErr.message); }\n")
    final_lines.append('        }\n')
    final_lines.append('\n')
    final_lines.append("        const transporter = (await import('nodemailer')).default.createTransport({\n")
    final_lines.append("            service: 'gmail',\n")
    final_lines.append("            auth: { user: process.env.EMAIL_USER || 'stitchapp.support@gmail.com', pass: process.env.EMAIL_PASS }\n")
    final_lines.append('        });\n')
    final_lines.append('\n')
    final_lines.append('        const html = `\n')
    final_lines.append('            <div style="font-family: sans-serif; max-width: 600px; color: #333;">\n')
    final_lines.append('                <h2>🐞 Technical Bug Report</h2>\n')
    final_lines.append('                <p><b>Reporter:</b> ${user.name} (@${user.username})</p>\n')
    final_lines.append('                <p><b>OS:</b> ${metadata.os} (${metadata.osVersion})</p>\n')
    final_lines.append('                <hr/>\n')
    final_lines.append('                <p>${description}</p>\n')
    final_lines.append('                ${uploadedUrls.length > 0 ? `\n')
    final_lines.append('                    <div style="display: flex; flex-wrap: wrap;">\n')
    final_lines.append('                        ${uploadedUrls.map(url => `<img src="${url}" width="180" style="margin: 5px; border-radius: 8px;"/>`).join(\'\')}\n')
    final_lines.append('                    </div>\n')
    final_lines.append('                ` : \'\'}\n')
    final_lines.append('            </div>\n')
    final_lines.append('        `;\n')
    final_lines.append('\n')
    final_lines.append('        const mailOptions = {\n')
    final_lines.append("            from: `\"STITCH Triage\" <${process.env.EMAIL_USER || 'stitchapp.support@gmail.com'}>`,\n")
    final_lines.append("            to: 'devanshjais20@gmail.com',\n")
    final_lines.append("            subject: `🐞 BUG: ${description.substring(0, 40)}`,\n")
    final_lines.append('            html\n')
    final_lines.append('        };\n')
    final_lines.append('\n')
    final_lines.append("        transporter.sendMail(mailOptions).catch(e => console.error('[Nodemailer] Dispatch Fail:', e.message));\n")
    final_lines.append("        res.status(200).json({ success: true, message: 'Bug report dispatched to dev' });\n")
    final_lines.append('    } catch (err) { next(err); }\n')
    final_lines.append('};\n')
    final_lines.append('\n')
    final_lines.append('export const submitSupportRequest = async (req, res, next) => {\n')
    final_lines.append('    try {\n')
    final_lines.append('        const { name, message, metadata } = req.body;\n')
    final_lines.append("        const user = await User.findById(req.user.id).select('email username').lean();\n")
    final_lines.append('\n')
    final_lines.append("        const transporter = (await import('nodemailer')).default.createTransport({\n")
    final_lines.append("            service: 'gmail',\n")
    final_lines.append("            auth: { user: process.env.EMAIL_USER || 'stitchapp.support@gmail.com', pass: process.env.EMAIL_PASS }\n")
    final_lines.append('        });\n')
    final_lines.append('\n')
    final_lines.append('        const html = `\n')
    final_lines.append('            <div style="font-family: sans-serif; max-width: 600px; color: #333;">\n')
    final_lines.append('                <h2>📬 New Support Request</h2>\n')
    final_lines.append('                <p><b>From:</b> ${name} (${user.email})</p>\n')
    final_lines.append('                <p><b>Message:</b></p>\n')
    final_lines.append('                <p style="background: #f9f9f9; padding: 15px; border-radius: 8px;">${message}</p>\n')
    final_lines.append('            </div>\n')
    final_lines.append('        `;\n')
    final_lines.append('\n')
    final_lines.append('        await transporter.sendMail({\n')
    final_lines.append("            from: `\"STITCH Support\" <${process.env.EMAIL_USER || 'stitchapp.support@gmail.com'}>`,\n")
    final_lines.append("            to: 'devanshjais20@gmail.com',\n")
    final_lines.append("            subject: `📬 Support Request: ${name}`,\n")
    final_lines.append('            html\n')
    final_lines.append('        });\n')
    final_lines.append('\n')
    final_lines.append("        res.status(200).json({ success: true, message: 'Support request sent to dev' });\n")
    final_lines.append('    } catch (err) { next(err); }\n')
    final_lines.append('};\n')

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)
    print("DONE_CLEAN")
else:
    print("FAIL_TRUNCATE")
