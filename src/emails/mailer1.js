export const mailer1Template = ({ recipientName, crmName, crmEmail, crmPhone }) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>IITGJobs.com Pvt. Ltd. - HR Solutions Providers</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif; color:#000000;">

    <!-- Main Container -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8; padding:30px 0;">
      <tr>
        <td align="center">

          <!-- Content Box -->
          <table width="650" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <!-- Body -->
            <tr>
              <td style="padding:30px; color:#000000;">

                <!-- Greeting -->
                <p style="font-size:16px; margin:0 0 15px; color:#000000;">Dear ${recipientName},</p>
                <p style="margin:0 0 20px; color:#000000;">Greetings from <strong>IITGJobs.com Pvt. Ltd.</strong>!</p>

                <!-- Intro -->
                <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#000000;">
                  I hope you are doing well. My name is <strong>${crmName}</strong>, and I am delighted to introduce
                  <strong>IITGJobs.com Pvt. Ltd.</strong>, a trusted HR solutions provider with over <strong>30 years of experience</strong>.
                </p>

                <p style="margin:0 0 25px; font-size:15px; line-height:1.6; color:#000000;">
                  We specialize in delivering <strong>innovative, tech-driven solutions</strong> that minimize organizational leakage 
                  and bridge critical talent gaps, ensuring stronger workforce stability.
                </p>

                <!-- Offerings -->
                <h3 style="margin:20px 0 15px; color:#000000; font-size:18px;">Our Latest Offerings</h3>

                <h4 style="margin:15px 0 8px; color:#000000; font-size:16px;"><strong>1. CHURN CONTROL MODEL (PREDICTIVE ANALYSIS REPORT)</strong></h4>
                <ul style="margin:0 0 20px; padding-left:20px; color:#000000; font-size:14px; line-height:1.6;">
                  <li><strong>HR Alert Reports:</strong> AI-driven insights to detect potential attrition.</li>
                  <li><strong>HR Retention Team:</strong> Collaborative strategies with your HR team for employee retention.</li>
                </ul>

                <h4 style="margin:15px 0 8px; color:#000000; font-size:16px;"><strong>2. PREFERRED PARTNER MODEL (PPM) -RECRUITMENT SERVICES  </strong></h4>
                <ul style="margin:0 0 25px; padding-left:20px; color:#000000; font-size:14px; line-height:1.6;">
                  <li><strong>Unmatched Hiring Rates:</strong> Just 2% of the CTC across levels (T&amp;C apply).</li>
                  <li><strong>Tech-Driven Process:</strong> Seamless, efficient, and hassle-free recruitment.</li>
                </ul>

                <!-- CTA -->
                <p style="margin:25px 0 20px; font-size:15px; line-height:1.6; color:#000000;">
                  We would be happy to schedule a <strong>15–20 minute call</strong> at your convenience
                  to explore how these solutions can add value to your organization.
                  Please find the attached presentation for your reference.
                </p>

                <p style="margin:0 0 20px; color:#000000;">Looking forward to your positive response.</p>

                <p style="margin:0 0 25px; color:#000000;">
                  Warm regards,<br/>
                  <strong>${crmName}</strong><br/>
                  ${crmPhone ? `📞 ${crmPhone}<br/>` : ''}
                  ${crmEmail ? `✉️ <a href="mailto:${crmEmail}" style="color:#000000; text-decoration:none;">${crmEmail}</a><br/>` : ''}
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="background:#f4f6f8; padding:15px; font-size:12px; color:#000000;">
                © ${new Date().getFullYear()} IITGJobs.com Pvt. Ltd. All Rights Reserved.
              </td>
            </tr>

          </table>
          <!-- End Content Box -->

        </td>
      </tr>
    </table>
    <!-- End Main Container -->

  </body>
</html>
`;
