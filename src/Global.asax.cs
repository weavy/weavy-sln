using System;
using System.Threading;
using System.Web;
using Weavy.Core.Helpers;

namespace Weavy {

    /// <summary>
    /// 
    /// </summary>
    public class Global : System.Web.HttpApplication {

        /// <summary>
        /// Occurs as the first event in the HTTP pipeline chain of execution when ASP.NET responds to a request.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        protected void Application_BeginRequest(object sender, EventArgs e) {
            // set preferred culture based on Accept-Language header
            if (sender is HttpApplication app && app.Context?.Request?.Headers != null) {
                Thread.CurrentThread.CurrentCulture = CultureHelper.GetCultureFromHeader(app.Context.Request.Headers["Accept-Language"]) ?? Thread.CurrentThread.CurrentCulture;
            }
        }

        /// <summary>
        /// Occurs just before ASP.NET sends content to the client.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        protected void Application_PreSendRequestHeaders(object sender, EventArgs e) {
            // remove some HTTP Headers for a little extra security (by obscurity)
            if (sender is HttpApplication app && app.Context?.Response?.Headers != null) {
                // remove the "Server" HTTP Header added by ASP.NET
                app.Context.Response.Headers.Remove("Server");
                // remove the "X-Engine" HTTP Header added by the WebDAV Engine
                app.Context.Response.Headers.Remove("X-Engine");
            }
        }
    }
}
