using System;
using System.Web;
using Weavy.Core;
using Weavy.Core.Utils;

namespace Weavy {

    /// <summary>
    /// 
    /// </summary>
    public class Global : System.Web.HttpApplication {

        /// <summary>
        /// Set culture for the request.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        protected void Application_PreRequestHandlerExecute(object sender, EventArgs e) {
            CultureUtils.SetCulture(WeavyContext.Current.User);
        }

        /// <summary>
        /// Remove some HTTP Headers for a little extra security (by obscurity)
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        protected void Application_PreSendRequestHeaders(object sender, EventArgs e) {
            if (sender is HttpApplication app && app.Context?.Response?.Headers != null) {
                // remove the "Server" HTTP Header added by ASP.NET
                app.Context.Response.Headers.Remove("Server");
                // remove the "X-Engine" HTTP Header added by the WebDAV Engine
                app.Context.Response.Headers.Remove("X-Engine");
            }
        }
    }
}
